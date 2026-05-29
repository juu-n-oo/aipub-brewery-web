#!/bin/bash
set -e

sudo docker build -t dockerizer-web:0.0.1 .
sudo docker save -o web.tar dockerizer-web:0.0.1
sudo ctr -n k8s.io images import web.tar
sudo kubectl rollout restart deploy -n aipub dockerizer-web
rm -f web.tar

echo "Web deployed successfully."
