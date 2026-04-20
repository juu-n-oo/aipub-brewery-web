#!/bin/bash
set -e

sudo docker build -t aipub-brewery-web:0.0.1 .
sudo docker save -o web.tar aipub-brewery-web:0.0.1 .
sudo ctr -n k8s.io images import web.tar
sudo kubectl rollout restart deploy -n aipub aipub-brewery-web
rm -f web.tar

echo "Web deployed successfully."
