import pandas as pd
import os

folder_path = "../raw_data"

all_data = []

for file in os.listdir(folder_path):
    if file.endswith((".xls", ".xlsx", ".ods")):

        file_path = os.path.join(folder_path, file)
        print(f"Processing {file}")

        try:
            try:
                df = pd.read_excel(file_path, sheet_name="Village Directory")
            except:
                df = pd.read_excel(file_path)

            # clean column names
            df.columns = df.columns.str.strip()

            if "Area Name" in df.columns:
                temp = df[["Area Name"]].copy()

                temp["Area Name"] = temp["Area Name"].astype(str).str.strip()

                # add state
                state = file.split("_")[-1].split(".")[0]
                temp["STATE"] = state

                # rename column
                temp.rename(columns={"Area Name": "VILLAGE NAME"}, inplace=True)

                all_data.append(temp)

            else:
                print("⚠️ Column missing in:", file)

        except Exception as e:
            print("❌ Error:", e)


if not all_data:
    print("❌ No data collected!")
    exit()

final_df = pd.concat(all_data, ignore_index=True)

# cleanup
final_df = final_df.dropna()
final_df = final_df.drop_duplicates()

# save
final_df.to_csv("clean_india_villages.csv", index=False)

print("✅ Done! Rows:", len(final_df))