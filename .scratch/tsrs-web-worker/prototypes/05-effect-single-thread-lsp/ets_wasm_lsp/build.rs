// The module's shadow stack, as crates/tsrs_wasm/build.rs (80 MiB; TSRS_WASM_STACK_SIZE overrides it, in bytes).
// Without it the linker's default is 1 MiB.

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
