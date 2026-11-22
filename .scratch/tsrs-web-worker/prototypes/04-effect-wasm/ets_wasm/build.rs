// Prototype (effect-tsgo): a copy of tsrs's crates/tsrs_wasm/build.rs (the 80 MiB shadow stack).
// The module's shadow stack (address-taken locals; the first thing in linear memory, so an overflow traps instead of
// corrupting data). notes/wasm-build.md has the census that chose the size. TSRS_WASM_STACK_SIZE overrides it (bytes;
// for the census). Only for wasm targets: native test builds of this crate link as usual.

const STACK_SIZE: u64 = 80 << 20;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-env-changed=TSRS_WASM_STACK_SIZE");
    let family = std::env::var("CARGO_CFG_TARGET_FAMILY").unwrap_or_default();
    if family.split(',').any(|f| f == "wasm") {
        let size = std::env::var("TSRS_WASM_STACK_SIZE")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(STACK_SIZE);
        println!("cargo:rustc-cdylib-link-arg=-zstack-size={size}");
    }
}
