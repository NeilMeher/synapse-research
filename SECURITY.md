# Security

The released research site is static. It accepts no uploads, credentials, personal identifiers or backend requests. The manuscript reader accepts registered study identifiers, treats document text as inert content, and resolves links through a protocol allowlist. Search and scenario computation run locally. See [the threat model](THREAT_MODEL.md).

Report a suspected security issue privately through the repository's GitHub security advisory workflow when it is enabled. Avoid sharing secrets or participant information in public issues. For algorithm bugs, give the scenario and version so a maintainer can reproduce the correctness issue.
