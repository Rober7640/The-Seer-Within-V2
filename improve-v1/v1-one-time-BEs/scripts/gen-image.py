#!/usr/bin/env python3
"""Generate one image per prompt file via codex. The generic runner.

  python3 scripts/gen-image.py out1.png prompt1.txt  out2.png prompt2.txt

⛔ TWO THINGS THAT WILL WASTE YOUR AFTERNOON IF YOU CHANGE THEM
  1. stdin=DEVNULL. `codex exec` reads stdin whenever it is not a TTY and then blocks
     forever — "Reading additional input from stdin...". A backgrounded shell subshell
     hits this every time and hangs until killed.
  2. Keep prompts declarative and about this length. A longer, shoutier prompt full of
     ⛔ blocks and "never do X" makes codex deliberate past the timeout and return nothing.
"""
import subprocess, sys, os, concurrent.futures as cf


def one(job):
    out, pf = job
    path = os.path.abspath(out)
    prompt = (f"Generate one image and save it to exactly this path: {path}\n\n"
              f"{open(pf).read().strip()}\n\nSave the image to {path} and then stop.")
    r = subprocess.run(
        ["codex", "exec", "--sandbox", "workspace-write", "--skip-git-repo-check", prompt],
        stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=600)
    ok = os.path.exists(path)
    return out, ok, (os.path.getsize(path) if ok else 0), (r.stderr or r.stdout)[-300:]


def main():
    a = sys.argv[1:]
    jobs = list(zip(a[::2], a[1::2]))
    with cf.ThreadPoolExecutor(max_workers=max(1, len(jobs))) as ex:
        for out, ok, size, tail in ex.map(one, jobs):
            print(f"{'✅' if ok else '❌'} {out}  {size//1024 if ok else 0}KB")
            if not ok:
                print(f"   {tail.strip()[:250]}")


if __name__ == "__main__":
    main()
