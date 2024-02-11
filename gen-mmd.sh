#!/bin/bash
pnpm exec mmdc -i mmd/runtime.mmd -o public/images/mmd/runtime.svg -t dark -b transparent
pnpm exec mmdc -i mmd/pipeline.mmd -o public/images/mmd/pipeline.svg -t dark -b transparent
pnpm exec mmdc -i mmd/layers.mmd -o public/images/mmd/layers.svg -t dark -b transparent