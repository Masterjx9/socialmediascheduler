# https://developers.google.com/youtube/v3/guides/uploading_a_video

account_flow = {
  "web": {
    "client_id": "[[INSERT CLIENT ID HERE]]",
    "client_secret": "[[INSERT CLIENT SECRET HERE]]",
    "redirect_uris": [],
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://accounts.google.com/o/oauth2/token"
  }
}

video_data = {
    "snippet": {
        "categoryId": 22,
        "description": "Description of uploaded video.",
        "title": "Title of uploaded video."
    },
    "status": {
        "privacyStatus": "private"
    }
}
