
doctor:
	@bash scripts/doctor.sh

ingest:
	@bash scripts/ingest_dump.sh

repro-check:
	@python3 repro-pack/repro_auditor.py --check || true

repro-update:
	@python3 repro-pack/repro_auditor.py --update
