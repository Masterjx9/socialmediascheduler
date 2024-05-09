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



def local_handler(scenario: str, creds: dict, content_type: str,  paths=None, post=None):
    if scenario == "instagram":
        if content_type == "image":
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


                meta.PostToIG(creds["ig_id"], creds["ig_access_token"], "local", public_url, paths["photo_path"])
                ngrok.terminate()
                httpd.shutdown()
        if content_type == "post":
            print("No setup for posting text to Instagram yet")
        if content_type == "video":
            print("No setup for posting videos to Instagram yet")
            
    if scenario == "twitter":  
        twitter.PostToTwitter(post, creds["twitter_consumer_key"], creds["twitter_consumer_secret"], creds["twitter_access_token"], creds["twitter_access_token_secret"])
    
    if scenario == "youtube":
        if content_type == "video":
            print("No setup for posting videos to YouTube yet")
        if content_type == "post":
            print("No setup for posting text to YouTube yet")
        if content_type == "image":
            print("No setup for posting images to YouTube yet")

    if scenario == "linkedin":
        if content_type == "post":
            print("No setup for posting text to LinkedIn yet")
        if content_type == "image":
            print("No setup for posting images to LinkedIn yet")
        if content_type == "video":
            print("No setup for posting videos to LinkedIn yet")
            

# This is a test 
def lambda_handler(event: dict, context: dict):
    scenario = event.get('scenario', 'default')
    try:
        if scenario == 'instagram':
            meta.PostToIG()
        elif scenario == 'twitter':
            twitter.PostToTwitter()
        else:
            print("Invalid scenario")
    except Exception as e:
        print(f"An error occurred: {e}")
    return {
        'statusCode': 200,
        'body': "Finished Posting!"
    }