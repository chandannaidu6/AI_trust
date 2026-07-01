from datasets import load_dataset

for lang in ["python", "java"]:
    ds = load_dataset("code-search-net/code_search_net", lang)
    for split in ds:                      # train, validation, test
        rows = ds[split]
        rows.to_json(f"csn_{lang}_{split}.jsonl")
        print(f"csn_{lang}_{split}.jsonl  ->  {len(rows)} rows")

    # quick peek so you can see it worked
    sample = ds["train"][0]
    print(f"\n--- {lang} sample ---")
    print("doc :", sample["func_documentation_string"][:150])
    print("code:", sample["func_code_string"][:150])
    print("url :", sample["func_code_url"], "\n")