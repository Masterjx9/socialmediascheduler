import time
import sqlite3
import os
import traceback
import sys

CONFIG_PATH = os.environ.get('CONFIG_PATH')
print("python path:", os.environ.get("PYTHONPATH"))
import yaml
import controller 

with open(CONFIG_PATH, 'r') as f:
    config = yaml.safe_load(f)

mode = config["DefaultSettings"]["mode"]
while True:
    # Connect to the database
    conn = sqlite3.connect(config["DefaultSettings"]["database_path"])
    cursor = conn.cursor()

    # Get the current date
    current_date = time.strftime('%Y-%m-%d %H:%M:%S')
    print(current_date)
    
    # Query the database for rows with post_date past the current date
    cursor.execute("SELECT * FROM content WHERE post_date < ? and published = 0", (current_date,))
    content_table = cursor.fetchall()
    
    for content_data in content_table:
        cursor.execute("SELECT * FROM content WHERE post_date < ? and published = 0", (current_date,))
        content_keys = [description[0] for description in cursor.description]
        content_values = content_data
        content_dict = dict(zip(content_keys, content_values))
        
        # print(row_dict)
        if time.time() >= content_dict["post_date"]:
            print(f"current time: {time.time()}")
            print(f"post date: {content_dict['post_date']}")
            # for loop through accounts to have them apply to the scenario based on the content type
            cursor.execute("SELECT * FROM social_media_accounts WHERE user_id = ?", (content_dict["user_id"],))
            accounts_table = cursor.fetchall()
            
            for accounts_data in accounts_table:
                cursor.execute("SELECT * FROM social_media_accounts WHERE user_id = ?", (content_dict["user_id"],))
                accounts_keys = [description[0] for description in cursor.description]
                accounts_values = accounts_data
                accounts_dict = dict(zip(accounts_keys, accounts_values))
                if accounts_dict["platform_name"] == "Meta/Instagram":
                    meta_table = cursor.execute("SELECT * FROM meta_accounts WHERE account_id = ?", (accounts_dict["account_id"],)).fetchone()
                    if content_dict["content_type"] == "image":
                        controller.local_handler(scenario="instagram", creds=meta_table, content_type=content_dict["content_type"], paths=content_dict["content_data"])
                    if content_dict["content_type"] == "post":
                        print("No setup for posting text to Instagram yet")
                    if content_dict["content_type"] == "video":
                        print(content_dict["content_data"])
                if accounts_dict["platform_name"] == "X/Twitter":
                    twitter_table = cursor.execute("SELECT * FROM twitter_accounts WHERE account_id = ?", (accounts_dict["account_id"],)).fetchone()
                    twitter_keys = [description[0] for description in cursor.description]
                    twitter_values = twitter_table
                    twitter_dict = dict(zip(twitter_keys, twitter_values))
                    if content_dict["content_type"] == "image":
                        print(content_dict["content_data"])
                        print("No setup for posting images to Twitter yet")
                    if content_dict["content_type"] == "post":
                        print(content_dict["content_data"])
                        print("Posting text to Twitter")
                        try:
                            controller.local_handler(scenario="twitter", creds=twitter_dict, content_type=content_dict["content_type"], post=content_dict["content_data"])
                            cursor.execute("UPDATE content SET published = 1 WHERE content_id = ?", (content_dict["content_id"],))
                            conn.commit()
                        except Exception as e:
                            traceback.print_exc()
                            
                    if content_dict["content_type"] == "video":
                        print(content_dict["content_data"])
                        print("No setup for posting videos to Twitter yet")
    conn.close()
    time.sleep(.03)
