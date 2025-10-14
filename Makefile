.PHONY: validate snapshot dump clean all

validate:
	. .venv/bin/activate 2>/dev/null || true; validate-timeline

snapshot:
	. .venv/bin/activate 2>/dev/null || true; make-snapshot $(ARGS)

dump:
	. .venv/bin/activate 2>/dev/null || true; dump-run --include-venv-freeze --include-git-status --run-id "$$EPOCH_ID"

clean:
	 rm -rf .seventh_horizon/runs/*
	 rm -f dump_*.tar.gz

all:
	$(MAKE) validate
	$(MAKE) snapshot ARGS="--nodes A B C"
	$(MAKE) dump
