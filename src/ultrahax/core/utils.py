from pathlib import Path


def choose_file(files: list[Path], label: str = "files") -> Path | None:
    if not files:
        print(f"No {label} found.")
        return None

    print(f"Available {label}:\n")
    for i, file in enumerate(files, start=1):
        print(f"{i}. {file.name}")

    choice = input("\nEnter file number: ").strip()

    if not choice.isdigit():
        print("Invalid input. Please enter a number.")
        return None

    index = int(choice) - 1
    if index < 0 or index >= len(files):
        print("Number out of range.")
        return None

    return files[index]