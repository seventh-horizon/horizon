.PHONY: validate snapshot dump clean all serve stop-serve open-dashboard

validate:
	. .venv/bin/activate 2>/dev/null || true; validate-timeline

snapshot:
	. .venv/bin/activate 2>/dev/null || true; make-snapshot $(ARGS)

dump:
	. .venv/bin/activate 2>/dev/null || true; dump-run --include-venv-freeze --include-git-status --run-id "$$EPOCH_ID"

clean:
	rm -rf .seventh_horizon/runs/* || true
	rm -f dump_*.tar.gz || true

all:
	$(MAKE) validate
	$(MAKE) snapshot ARGS="--nodes A B C"
	$(MAKE) dump



serve:
	python3 -m http.server 8000 > /tmp/hserv.log 2>&1 & echo $$! > /tmp/hserv.pid

stop-serve:
	if [ -f /tmp/hserv.pid ]; then kill "$$(cat /tmp/hserv.pid)" 2>/dev/null || true; rm -f /tmp/hserv.pid; echo "server stopped"; else echo "no server pid file found"; fi

open-dashboard:
	open http://localhost:8000/public/
status:
	ps -p "$$(cat /tmp/hserv.pid 2>/dev/null || echo 0)" -o pid,command || true
	curl -I http://localhost:8000/public/ || true
	curl -I http://localhost:8000/.seventh_horizon/runs/latest/telemetry.csv || true

restart-serve:
	$(MAKE) stop-serve || true
	$(MAKE) serve
