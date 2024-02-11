import json 
from requests_oauthlib import OAuth1Session


def PostToTwitter(payload,twitter_consumer_key,twitter_consumer_secret,twitter_access_token,twitter_access_token_secret):
    # Create an OAuth1 session
    oauth = OAuth1Session(
        twitter_consumer_key,
        client_secret=twitter_consumer_secret,
        resource_owner_key=twitter_access_token,
        resource_owner_secret=twitter_access_token_secret,
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
    return response.json()