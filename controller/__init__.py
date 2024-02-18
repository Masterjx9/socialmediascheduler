import logging
import os
import http.server
import socketserver
import threading
import subprocess
import requests
import time
from apis import meta, twitter

# Start a simple HTTP server in a new thread
PORT = 49150



def local_handler(scenarios, accounts, creds, paths=None, posts=None):
    if type(scenarios) == str:
        scenarios = [scenarios]
    if type(accounts) == str:
        accounts = [accounts]

    for scenario in scenarios:
        if scenario == "instagram":
            class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, directory=paths["photo_path"], **kwargs)

            Handler = CustomHTTPRequestHandler

            with socketserver.TCPServer(("", PORT), Handler) as httpd:
                thread = threading.Thread(target=httpd.serve_forever)
                thread.start()

                ngrok = subprocess.Popen(["ngrok", "http", str(PORT)], stdout=subprocess.PIPE)
                time.sleep(2)  # Give ngrok time to initialize

                resp = requests.get("http://localhost:4040/api/tunnels")
                public_url = resp.json()["tunnels"][0]["public_url"]


                for account in accounts["instagram"]:
                    meta.PostToIG(creds["ig_id"], creds["ig_access_token"], "local", public_url, paths["photo_path"])
                ngrok.terminate()
                httpd.shutdown()
                
        elif scenario == "twitter":
            for account in accounts["twitter"]:    
                for post in posts:
                    if posts["account"] == account:
                        twitter.PostToTwitter(post["payload"], creds["twitter_consumer_key"], creds["twitter_consumer_secret"], creds["twitter_access_token"], creds["twitter_access_token_secret"])
            


# from main import dailyPostToIG, dailyPostToTwitter

# IG_ACCOUNT1_ID = os.environ.get('IG_ACCOUNT1_ID')
# IG_ACCOUNT2_ID = os.environ.get('IG_ACCOUNT2_ID')

# def lambda_handler(event, ig_account):
#     logger = logging.getLogger()
#     logger.setLevel(logging.INFO)
#     scenario = event.get('scenario', 'default')
    
#     try:
#         if scenario == 'instagram':
#             logger.info("Executing Instagram scenario.")
#             if type(ig_account) == str:
#                 dailyPostToIG(ig_account)
#             elif type(ig_account) == list:
#                 for account in ig_account:
#                     dailyPostToIG(account)
#         elif scenario == 'twitter':
#             logger.info("Executing Twitter scenario.")
#             dailyPostToTwitter()
#         else:
#             logger.warning("No valid scenario provided.")
#     except Exception as e:
#         logger.error(f"An error occurred: {e}")
#     return {
#         'statusCode': 200,
#         'body': "Finished Posting!"
#     }