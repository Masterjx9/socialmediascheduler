import requests
from apis import awss3
from requests_oauthlib import OAuth1Session
import json
import dotenv
import os
from datetime import datetime

dotenv.load_dotenv()

IG_ACCESS_TOKEN = os.environ.get('IG_ACCESS_TOKEN')

TWITTER_BEARER_TOKEN = os.environ.get('TWITTER_BEARER_TOKEN')
TWITTER_APPID = os.environ.get('TWITTER_APPID')
TWITTER_CONSUMER_KEY = os.environ.get('TWITTER_CONSUMER_KEY')
TWITTER_CONSUMER_SECRET = os.environ.get('TWITTER_CONSUMER_SECRET')
TWITTER_ACCESS_TOKEN = os.environ.get('TWITTER_ACCESS_TOKEN')
TWITTER_ACCESS_TOKEN_SECRET = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')

def get_page_token(user_token):
    url = "https://graph.facebook.com/v17.0/pythonicit?fields=access_token"
    response = requests.get(url, params={"access_token": user_token})
    data = response.json()
    print(data)
    return data["access_token"]
    
def create_container(access_token, image_url, account, description, tags):
    hashtags = " ".join([f"#{tag}" for tag in tags.split()])
    caption = f"{description}\n\n{hashtags}"
    url = f'https://graph.facebook.com/v17.0/{account}/media'
    
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)
    return data["id"]

def publish_photo(access_token, account, creation_id):
    url = f'https://graph.facebook.com/v17.0/{account}/media_publish'
    
    payload = {
        "creation_id": creation_id,
        "access_token": access_token
    }
    response = requests.post(url, params=payload)
    data = response.json()
    print(data)



def dailyPostToIG(igid):
    today = datetime.now()
    formatted_date = today.strftime("%Y-%m-%d")
    folder_name = formatted_date  # Assuming the folder name is the date
    
    # List all files in the folder
    all_files = awss3.list_files_in_folder(folder_name)
    
    # Filter out the folder names
    all_files = [file for file in all_files if not file.endswith('/')]
    
    print(all_files)
    print(folder_name)
    for file_key in all_files:
        print(file_key)
        image_url, description, tags = awss3.generate_url(file_key)
        creation_id = create_container(IG_ACCESS_TOKEN, image_url, igid, description, tags)
        publish_photo(IG_ACCESS_TOKEN, igid, creation_id)


# x/twitter
def dailyPostToTwitter(payload):
    # Create an OAuth1 session
    oauth = OAuth1Session(
        TWITTER_CONSUMER_KEY,
        client_secret=TWITTER_CONSUMER_SECRET,
        resource_owner_key=TWITTER_ACCESS_TOKEN,
        resource_owner_secret=TWITTER_ACCESS_TOKEN_SECRET,
    )

    # The payload (your tweet)
    payload = {"text": payload}

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