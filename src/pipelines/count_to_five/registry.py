from .steps import (
    step_01_one,
    step_02_two,
    step_03_three,
    step_04_four,
    step_05_five,
)

STEP_REGISTRY = {
    "01_one": step_01_one.run,
    "02_two": step_02_two.run,
    "03_three": step_03_three.run,
    "04_four": step_04_four.run,
    "05_five": step_05_five.run,
}