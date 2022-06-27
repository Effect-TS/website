#!/bin/sh
cd $1
yarn
yarn build
yarn start