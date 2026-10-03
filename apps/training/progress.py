"""Prints one plain progress line at a time instead of a progress bar: step, percent, time left."""

import time

from transformers import TrainerCallback
from transformers.trainer_callback import PrinterCallback

PRINT_EVERY_SECONDS = 20


def format_duration(seconds):
    seconds = int(seconds)
    if seconds < 60:
        return f"{seconds}s"
    minutes, seconds = divmod(seconds, 60)
    if minutes < 60:
        return f"{minutes}m {seconds:02d}s"
    hours, minutes = divmod(minutes, 60)
    return f"{hours}h {minutes:02d}m"


class ProgressLine(TrainerCallback):
    """Every few seconds: which model, step, percent, elapsed, estimated time left, last loss."""

    def __init__(self, label):
        self.label = label
        self.started = 0.0
        self.last_print = 0.0
        self.loss = None

    def on_train_begin(self, args, state, control, **kwargs):
        self.started = time.monotonic()
        print(f"{self.label}: {state.max_steps} steps over {int(args.num_train_epochs)} epochs", flush=True)

    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs and "loss" in logs:
            self.loss = logs["loss"]

    def on_step_end(self, args, state, control, **kwargs):
        now = time.monotonic()
        if now - self.last_print < PRINT_EVERY_SECONDS and state.global_step != state.max_steps:
            return
        self.last_print = now
        elapsed = now - self.started
        done = state.global_step / max(state.max_steps, 1)
        left = elapsed / done - elapsed if done > 0 else 0
        loss = "" if self.loss is None else f", loss {self.loss:.4f}"
        print(f"{self.label}: step {state.global_step}/{state.max_steps} ({done:.0%}), {format_duration(elapsed)} elapsed, about {format_duration(left)} left{loss}", flush=True)

    def on_train_end(self, args, state, control, **kwargs):
        print(f"{self.label}: done in {format_duration(time.monotonic() - self.started)}", flush=True)


def attach_progress(trainer, label):
    """Swaps the trainer's progress bar and log dumps for one plain line every few seconds."""
    trainer.remove_callback(PrinterCallback)
    trainer.add_callback(ProgressLine(label))
    return trainer
