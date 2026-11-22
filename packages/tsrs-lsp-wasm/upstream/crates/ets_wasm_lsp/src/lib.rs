// Vendored by the Effect website (packages/tsrs-lsp-wasm); this crate is not part of Effect-TS/tsgo or tsrs. It is
// copied into an effect-tsgo checkout at crates/ets_wasm_lsp by scripts/build-wasm.ts.
//
// Derived from tsrs (Apache-2.0): the Effect variant of tsrs's crates/tsrs_wasm_lsp (single-thread patch). The same
// module and ABI, with the Effect hooks registered before the server is created, in the order of
// crates/ets_tsrs/src/main.rs (`register_hooks`).
//
// The tsrs language server as a single-threaded wasm32-wasip1 module (no threads, no shared memory), driven by a
// message pump: the host instantiates the module once and keeps it for the whole session.
//
// ABI:
//   lsp_input(len) -> ptr        a buffer of `len` bytes for the next call's argument
//   lsp_init(flags) -> status    creates the server; the input buffer holds the cwd (UTF-8). flags: 1 = the host
//                                file system is case-insensitive. 0 on success.
//   lsp_message() -> status      handles the JSON-RPC message in the input buffer (one message, no Content-Length
//                                header), including a request's async work. 0: idle; 3: background tasks are queued
//                                (call lsp_tick when idle); 1: the server exited (after `exit`); 2: a fatal read
//                                error (stderr has it).
//   lsp_tick() -> status         runs the queued background tasks and the timers that are due (idle cache clean),
//                                and what they queue. Same statuses.
//   lsp_next_timer_ms() -> i64   milliseconds until the next pending timer, or -1 when none.
//   lsp_output() -> ptr          the outgoing messages queued since the last call, as JSON texts each followed by
//   lsp_output_len() -> len      '\n' (taken by `lsp_output`; `lsp_output_len` is valid right after it)
// File access goes through the `tsrs_host.fs` / `fs_take` imports (crates/tsrs_wasm/src/host.rs). WebAssembly
// cannot unwind: a panic aborts the instance (trap), and the host has to start a new one.

#[path = "../../../tsrs/crates/tsrs_wasm/src/host.rs"]
mod host;

use std::sync::Arc;
use std::time::Duration;

use tsrs_core::context::Context;
use tsrs_vfs::{FS, bundled};

fn status_code(status: tsrs_lsp::PumpStatus) -> i32 {
    match status {
        tsrs_lsp::PumpStatus::Idle => 0,
        tsrs_lsp::PumpStatus::Exited => 1,
        tsrs_lsp::PumpStatus::Pending => 3,
    }
}

/// Go's `init()`s of the hook packages the patched cmd/tsc/main.go imports, as ets_tsrs's `register_hooks`. Each one
/// sits behind a `Once`.
fn register_hooks() {
    ets_etscheckerhooks::init();
    ets_etsexecutehooks::init();
    ets_etslshooks::init();
}

pub struct Pump {
    server: Arc<tsrs_lsp::Server>,
}

impl Pump {
    pub fn new(cwd: &str, case_sensitive: bool) -> Pump {
        register_hooks();
        let fs: Arc<dyn FS> = Arc::new(bundled::wrap_fs(host::HostFs::new(case_sensitive)));
        let server = tsrs_lsp::new_server(tsrs_lsp::ServerOptions {
            in_: tsrs_lsp::to_reader(std::io::empty()),
            out: tsrs_lsp::to_writer(std::io::sink()),
            err: Box::new(std::io::stderr()),
            cwd: tsrs_core::tspath::normalize_path(cwd),
            fs: Some(fs),
            default_library_path: bundled::lib_path(),
            typings_location: String::new(),
            parse_cache: None,
            npm_install: None,
            spawn: None,
            progress_delay: Duration::ZERO,
            set_parent_process_id: None,
        });
        server.pump_start(&Context::background());
        Pump { server }
    }

    pub fn message(&self, data: &[u8]) -> i32 {
        match self.server.pump_message(data) {
            Ok(status) => status_code(status),
            Err(err) => {
                eprintln!("{err}");
                2
            }
        }
    }

    pub fn tick(&self) -> i32 {
        status_code(self.server.pump_tick())
    }

    pub fn take_output(&self, out: &mut Vec<u8>) {
        self.server.pump_take_outgoing(out);
    }
}

#[cfg(target_family = "wasm")]
mod abi {
    use std::cell::RefCell;

    use super::Pump;

    thread_local! {
        static INPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
        static OUTPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
        static PUMP: RefCell<Option<&'static Pump>> = const { RefCell::new(None) };
    }

    fn pump() -> &'static Pump {
        PUMP.with_borrow(|p| p.expect("lsp_init was not called"))
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_input(len: usize) -> *mut u8 {
        INPUT.with_borrow_mut(|input| {
            input.clear();
            input.resize(len, 0);
            input.as_mut_ptr()
        })
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_init(flags: u32) -> i32 {
        // The one-thread rayon pool must exist before any other rayon use (tsrs_compiler::worker_pool), as in
        // crates/tsrs_wasm; tsrs_lsp reaches it through the program build.
        tsrs_compiler::worker_pool();
        let cwd = INPUT.with_borrow_mut(std::mem::take);
        let cwd = String::from_utf8_lossy(&cwd).into_owned();
        let pump: &'static Pump = Box::leak(Box::new(Pump::new(&cwd, flags & 1 == 0)));
        PUMP.with_borrow_mut(|p| *p = Some(pump));
        0
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_message() -> i32 {
        let data = INPUT.with_borrow_mut(std::mem::take);
        pump().message(&data)
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_tick() -> i32 {
        pump().tick()
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_next_timer_ms() -> i64 {
        tsrs_core::pump::next_timer_in().map_or(-1, |d| i64::try_from(d.as_millis()).unwrap_or(i64::MAX))
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_output() -> *const u8 {
        OUTPUT.with_borrow_mut(|out| {
            out.clear();
            pump().take_output(out);
            out.as_ptr()
        })
    }

    #[unsafe(no_mangle)]
    pub extern "C" fn lsp_output_len() -> usize {
        OUTPUT.with_borrow(Vec::len)
    }
}
