if [ -f .env.bak ]; then
  cp .env.bak .env
else
  cp .sample.env .env
fi
export PORT=5001
open http://localhost:5001
foreman s
