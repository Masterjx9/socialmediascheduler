import json 
from requests_oauthlib import OAuth1Session
import os
import time

def postTextToTwitter(twitter_payload,twitter_consumer_key,twitter_consumer_secret,twitter_access_token,twitter_access_token_secret):
    # Create an OAuth1 session
    oauth = OAuth1Session(
        twitter_consumer_key,
        client_secret=twitter_consumer_secret,
        resource_owner_key=twitter_access_token,
        resource_owner_secret=twitter_access_token_secret,
    )

    # The payload (your tweet)
    payload = {"text": twitter_payload}

    # Making the request to post a tweet using v2 API
    response = oauth.post(
        "https://api.twitter.com/2/tweets",
        json=payload,
    )
    # Check the x-access-level header
    if 'x-access-level' in response.headers:
        print(f"Access level: {response.headers['x-access-level']}")
    else:
        print("Could not determine access level.")
    # Check if the tweet was successful
    if response.status_code == 201:
        print("Tweet successful!")
        json_response = response.json()
        print(json.dumps(json_response, indent=4, sort_keys=True))
    else:
        print(f"Failed to tweet: {response.content}")
    return response.json()

def postImageToTwitter(twitter_payload, twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret):
    # Create an OAuth1 session
    oauth = OAuth1Session(
        twitter_consumer_key,
        client_secret=twitter_consumer_secret,
        resource_owner_key=twitter_access_token,
        resource_owner_secret=twitter_access_token_secret,
    )

    # Step 1: Upload the image to Twitter
    files = {'media': open(twitter_payload["image_path"], 'rb')}
    response = oauth.post("https://upload.twitter.com/1.1/media/upload.json", files=files)
    files['media'].close()
    
    if response.status_code != 200:
        print(f"Failed to upload media: {response.content}")
        return response.json()

    media_id = response.json()['media_id_string']

    # Step 2: Post a tweet with the uploaded media ID
    payload = {
        "text": twitter_payload["description"],
        "media": {
            "media_ids": [media_id]
        }
    }

    response = oauth.post("https://api.twitter.com/2/tweets", json=payload)
    if 'x-access-level' in response.headers:
        print(f"Access level: {response.headers['x-access-level']}")
    else:
        print("Could not determine access level.")

    if response.status_code == 201:
        print("Tweet successful!")
        json_response = response.json()
        print(json.dumps(json_response, indent=4, sort_keys=True))
    else:
        print(f"Failed to tweet: {response.content}")
        return response.json()


def postVideoToTwitter(twitter_payload, twitter_consumer_key, twitter_consumer_secret, twitter_access_token, twitter_access_token_secret):
    # Create an OAuth1 session
    oauth = OAuth1Session(
        twitter_consumer_key,
        client_secret=twitter_consumer_secret,
        resource_owner_key=twitter_access_token,
        resource_owner_secret=twitter_access_token_secret,
    )

    # Step 1: INIT command
    files = {
        'command': 'INIT',
        'media_type': 'video/mp4',
        'total_bytes': str(os.path.getsize(twitter_payload["video_path"]))
    }
    response = oauth.post("https://upload.twitter.com/1.1/media/upload.json", data=files)
    
    if response.status_code not in [200, 202]:
        print(f"Failed to initialize video upload: {response.text}")
        return

    media_id = response.json()['media_id_string']

    # Step 2: APPEND command
    with open(twitter_payload["video_path"], 'rb') as f:
        data = f.read()
    files = {'command': 'APPEND', 'media_id': media_id, 'segment_index': '0', 'media': data}
    response = oauth.post("https://upload.twitter.com/1.1/media/upload.json", files=files)
    if response.status_code != 204:
        print(f"Failed to upload video: {response.text}")
        return

    # Step 3: FINALIZE command
    files = {'command': 'FINALIZE', 'media_id': media_id}
    response = oauth.post("https://upload.twitter.com/1.1/media/upload.json", data=files)
    if response.status_code not in [200, 202]:
        print(f"Failed to finalize video upload: {response.text}")
        return

    # Optional Step 3.5: STATUS command to check processing status
    processing_info = response.json().get('processing_info', None)
    if processing_info:
        print(processing_info)
        while processing_info['state'] != 'succeeded':
            print(processing_info)

            if processing_info['state'] == 'failed':
                print("Video processing failed.")
                return
            print("Waiting for video processing...")
            time.sleep(processing_info.get('check_after_secs', 5))
            response = oauth.get(f"https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id={media_id}")
            print(response.json())  
            processing_info = response.json().get('processing_info', {})
    
    # Step 4: Post a tweet
    payload = {
        "text": twitter_payload["description"],
        "media": {
            "media_ids": [media_id]
        }
    }
    response = oauth.post("https://api.twitter.com/2/tweets", json=payload)
    if response.status_code == 201:
        print("Tweet successful!")
        json_response = response.json()
        print(json.dumps(json_response, indent=4, sort_keys=True))
    else:
        print(f"Failed to tweet: {response.text}")
        return response.json()