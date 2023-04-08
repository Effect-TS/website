#!/bin/sh
kubectl kustomize ./infra/overlays/prod --enable-alpha-plugins -o deploy.yaml
