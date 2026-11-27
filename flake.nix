{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    # Pinned Rust toolchains for packages/tsrs-lsp-wasm (nixpkgs' rustc lags the
    # version the Effect-patched tsrs tree needs).
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    { nixpkgs, rust-overlay, ... }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system:
          function (
            import nixpkgs {
              inherit system;
              overlays = [ rust-overlay.overlays.default ];
            }
          )
        );
    in
    {
      formatter = forAllSystems (pkgs: pkgs.alejandra);
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShellNoCC {
          packages = with pkgs; [
            corepack_24
            nodejs_24
            playwright-driver.browsers
            # packages/tsrs-lsp-wasm: keep the version in sync with
            # packages/tsrs-lsp-wasm/upstream/pins.json (rust.toolchain).
            (rust-bin.stable."1.100.0".minimal.override {
              targets = [ "wasm32-wasip1" ];
            })
            binaryen
            # A host C compiler and linker for Cargo build scripts.
            stdenv.cc
          ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
          '';
        };
      });
    };
}
