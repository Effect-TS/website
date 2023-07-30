let
  flakeLock = builtins.fromJSON (builtins.readFile ./flake.lock);
  nixpkgsLock = flakeLock.nodes.nixpkgs.locked;
  lockedNixpkgs =
    import
    (fetchTarball {
      url = "https://github.com/NixOS/nixpkgs/archive/${nixpkgsLock.rev}.tar.gz";
      sha256 = nixpkgsLock.narHash;
    })
    {};
in
  {pkgs ? lockedNixpkgs}: let
    corepackEnable = pkgs.runCommand "corepack-enable" {} ''
      mkdir -p $out/bin
      ${pkgs.nodejs-18_x}/bin/corepack enable --install-directory $out/bin
    '';
  in
    with pkgs;
      mkShell {
        name = "nixos-shell";

        # Enable experimental features without having to specify the argument
        NIX_CONFIG = "extra-experimental-features = nix-command flakes repl-flake";

        buildInputs = [
          age
          alejandra
          corepackEnable
          git
          home-manager
          kubectl
          nix
          nil
          nodejs-18_x
          pre-commit
          python310Packages.pre-commit-hooks
          sops
          ssh-to-age
        ];

        KUSTOMIZE_PLUGIN_HOME = pkgs.buildEnv {
          name = "kustomize-plugins";
          paths = [
            kustomize-sops
          ];
          postBuild = ''
            mv $out/lib/* $out
            rm -r $out/lib
          '';
          pathsToLink = ["/lib"];
        };

        shellHook = ''
          pre-commit install
        '';
      }
