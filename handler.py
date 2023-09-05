import os
import logging

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

from main import dailyPostToIG, dailyPostToTwitter

IG_ACCOUNT1_ID = os.environ.get('IG_ACCOUNT1_ID')
IG_ACCOUNT2_ID = os.environ.get('IG_ACCOUNT2_ID')

def lambda_handler(event, context):
    
    scenario = event.get('scenario', 'default')
    
    try:
        if scenario == 'instagram':
            logger.info("Executing Instagram scenario.")
            dailyPostToIG(IG_ACCOUNT2_ID)
        elif scenario == 'twitter':
            logger.info("Executing Twitter scenario.")
            dailyPostToTwitter()
        else:
            logger.warning("No valid scenario provided.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
