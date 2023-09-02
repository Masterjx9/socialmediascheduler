# handler.py
import dotenv
import os

dotenv.load_dotenv()

from main import dailyPostToIG, dailyPostToTwitter

IG_ACCOUNT1_ID = os.environ.get('IG_ACCOUNT1_ID')
IG_ACCOUNT2_ID = os.environ.get('IG_ACCOUNT2_ID')
def lambda_handler(event, context):
    scenario = event.get('scenario', 'default')
    
    if scenario == 'instagram':
        dailyPostToIG(IG_ACCOUNT2_ID)
    elif scenario == 'twitter':
        dailyPostToTwitter()
    else:
        print("No valid scenario provided.")
