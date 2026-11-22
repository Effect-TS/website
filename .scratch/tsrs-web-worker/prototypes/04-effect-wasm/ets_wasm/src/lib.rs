// tsc as a WebAssembly module (wasm32-wasip1) over a host file system: notes/wasm-build.md has the design and the
// numbers, npm/tsrs-wasm the JS host.
//
// ABI (one request per module instance; the host compiles the module once and instantiates it per run):
//   tsrs_input(len) -> ptr    a buffer of `len` bytes for the request
//   tsrs_run() -> status      runs it; tsc's text goes to stdout (WASI fd 1); returns the exit status
//   tsrs_output() -> ptr      the reply (empty, or the JSON diagnostics with REQUEST_JSON_DIAGNOSTICS)
//   tsrs_output_len() -> len
// Request: NUL-separated UTF-8, `cwd \0 flags` then `\0 arg` per tsc argument; flags is the decimal of the
// REQUEST_* bits. A panic prints Rust's message on stderr and exits with status 5 (native tsrs's status for a panicked
// driver thread). A trap (shadow-stack overflow, allocation failure) never returns here; the JS host maps it to 5 too.

// Prototype (effect-tsgo): tsrs_wasm's modules, unchanged, from the patched tsrs checkout.
#[path = "../../../tsrs/crates/tsrs_wasm/src/host.rs"]
mod host;
#[path = "../../../tsrs/crates/tsrs_wasm/src/json.rs"]
mod json;
#[path = "../../../tsrs/crates/tsrs_wasm/src/sys.rs"]
mod sys;

/// Prototype (effect-tsgo): the hooks the native executable registers before tsrs's CLI (crates/ets_tsrs main.rs),
/// minus ets_etslshooks (code fixes, completions, refactors: language-service only, never reached by `tsc`).
fn register_hooks() {
    ets_etscheckerhooks::init();
    ets_etsexecutehooks::init();
    #[cfg(feature = "lshooks")]
    ets_etslshooks::init();
}

use std::io::Write;
use std::sync::{Arc, Mutex};

use tsrs_execute::tsc::System;

/// Reply with the diagnostics as a JSON array of `DiagnosticResponse` (UTF-16 positions) instead of printing them.
const REQUEST_JSON_DIAGNOSTICS: u32 = 1;
/// The host file system is case-insensitive.
const REQUEST_CASE_INSENSITIVE: u32 = 2;
/// stdout is a terminal (the default for `--pretty`).
const REQUEST_TTY: u32 = 4;

struct Request {
    cwd: String,
    flags: u32,
    args: Vec<String>,
}

fn parse_request(request: &[u8]) -> Request {
    let mut fields =
        request.split(|&b| b == 0).map(|f| tsrs_core::utf8::from_utf8_lossy(f).into_owned());
    let cwd = fields.next().unwrap_or_default();
    let flags = fields.next().and_then(|f| f.parse::<u32>().ok()).unwrap_or(0);
    Request { cwd, flags, args: fields.collect() }
}

/// Runs one request: (exit status, reply bytes). Target-independent, so native tests drive it over `host::test_host`.
pub fn run(request: &[u8]) -> (i32, Vec<u8>) {
    run_with_output(request, Box::new(std::io::BufWriter::new(std::io::stdout())))
}

fn run_with_output(request: &[u8], out: Box<dyn Write + Send>) -> (i32, Vec<u8>) {
    // The one-thread rayon pool must exist before any other rayon use (tsrs_compiler::worker_pool).
    tsrs_compiler::worker_pool();
    register_hooks();
    let request = parse_request(request);
    let diagnostics =
        (request.flags & REQUEST_JSON_DIAGNOSTICS != 0).then(|| Arc::new(Mutex::new(Vec::new())));
    let sys: &'static sys::WasmSys = Box::leak(Box::new(sys::WasmSys::new(
        &request.cwd,
        request.flags & REQUEST_CASE_INSENSITIVE == 0,
        request.flags & REQUEST_TTY != 0,
        diagnostics.clone(),
        out,
    )));
    let result = tsrs_execute::execute::command_line(sys, request.args);
    sys.flush();
    let reply = match diagnostics {
        Some(list) => json::encode(&list.lock().unwrap()),
        None => Vec::new(),
    };
    (result.status as i32, reply)
}

#[cfg(target_family = "wasm")]
mod abi {
    use std::cell::RefCell;

    thread_local! {
        static INPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
        static OUTPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn tsrs_input(len: usize) -> *mut u8 {
        INPUT.with_borrow_mut(|input| {
            input.clear();
            input.resize(len, 0);
            input.as_mut_ptr()
        })
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn tsrs_run() -> i32 {
        let default_hook = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            default_hook(info);
            std::process::exit(tsrs_execute::tsc::ExitStatus::NotImplemented as i32);
        }));
        let request = INPUT.with_borrow_mut(std::mem::take);
        let (status, reply) = super::run(&request);
        OUTPUT.with_borrow_mut(|output| *output = reply);
        status
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn tsrs_output() -> *const u8 {
        OUTPUT.with_borrow(Vec::as_ptr)
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn tsrs_output_len() -> usize {
        OUTPUT.with_borrow(Vec::len)
    }
}

