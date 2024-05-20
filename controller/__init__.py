import logging
import os
import http.server
import socketserver
import threading
import subprocess
import requests
import time
from apis import meta, twitter, linkedin
import sys
import platform
import traceback
# Start a simple HTTP server in a new thread
PORT = 49150

if sys.platform == "win32":
    ngrok_platform = "ngrok_windows"
if sys.platform == "linux":
    ngrok_platform = "ngrok_linux"
if sys.platform == "darwin":
    if platform.processor() == "arm":
        ngrok_platform = "ngrok_mac_apple"
    else:
        ngrok_platform = "ngrok_mac_intel"



def local_handler(scenario: str, creds: dict, content_type: str,  paths=None, post=None):
    if scenario == "instagram":
        if content_type == "image":
            Handler = http.server.SimpleHTTPRequestHandler
            httpd = socketserver.TCPServer(("", PORT), Handler)
            thread = threading.Thread(target=httpd.serve_forever)
            thread.start()


            ngrok_path = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "ngrok", ngrok_platform)
            print(ngrok_path)
            ngrok = subprocess.Popen([ngrok_path, "http", str(PORT)], stdout=subprocess.PIPE)
            time.sleep(2)  
            try:
                resp = requests.get("http://localhost:4040/api/tunnels")
                public_url = resp.json()["tunnels"][0]["public_url"]
                print(public_url)
                meta.PostToIG(creds["ig_id"], creds["ig_access_token"], "local", public_url, paths["photo_path"])
                ngrok.terminate()
                httpd.shutdown()
            except Exception as e:
                traceback.print_exc()
                ngrok.terminate()
                httpd.shutdown()
                sys.exit(1) 

        if content_type == "post":
            print("No setup for posting text to Instagram yet")
        if content_type == "video":
            print("No setup for posting videos to Instagram yet")
            
    if scenario == "twitter":  
        if content_type == "image":
            print("Posting image to Twitter")
            twitter.postImageToTwitter(paths["photo_path"], creds["twitter_consumer_key"], creds["twitter_consumer_secret"], creds["twitter_access_token"], creds["twitter_access_token_secret"])
        if content_type == "post":
            print("Posting text to Twitter")
            twitter.postTextToTwitter(post, creds["twitter_consumer_key"], creds["twitter_consumer_secret"], creds["twitter_access_token"], creds["twitter_access_token_secret"])
        if content_type == "video":
            twitter.postVideoToTwitter(paths["video_path"], creds["twitter_consumer_key"], creds["twitter_consumer_secret"], creds["twitter_access_token"], creds["twitter_access_token_secret"])
    
    if scenario == "youtube":
        if content_type == "video":
            print("No setup for posting videos to YouTube yet")
        if content_type == "post":
            print("No setup for posting text to YouTube yet")
        if content_type == "image":
            print("No setup for posting images to YouTube yet")

    if scenario == "linkedin":
        if content_type == "post":
            print("Posting text to LinkedIn")
            linkedin.postMediaToLinkedIn(creds["linkedin_app_token"], "text", media_url={"description": post})
        if content_type == "image":
            print("Posting image to LinkedIn")
            linkedin.postMediaToLinkedIn(creds["linkedin_app_token"], "image", paths["photo_path"])
        if content_type == "video":
            print("Posting video to LinkedIn")
            linkedin.postMediaToLinkedIn(creds["linkedin_app_token"], "video", paths["video_path"])
            

# This is a test 
def lambda_handler(event: dict, context: dict):
    scenario = event.get('scenario', 'default')
    try:
        if scenario == 'instagram':
            meta.PostToIG()
        elif scenario == 'twitter':
            twitter.postTextToTwitter()
        else:
            print("Invalid scenario")
    except Exception as e:
        print(f"An error occurred: {e}")
    return {
        'statusCode': 200,
        'body': "Finished Posting!"
    }