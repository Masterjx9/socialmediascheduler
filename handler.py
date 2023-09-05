import os
import logging

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

import pkg_resources

def log_installed_packages():
    installed_packages = pkg_resources.working_set
    installed_packages_list = sorted(["%s==%s" % (i.key, i.version) for i in installed_packages])
    for package in installed_packages_list:
        print(package)
log_installed_packages()
# from main import dailyPostToIG, dailyPostToTwitter

# IG_ACCOUNT1_ID = os.environ.get('IG_ACCOUNT1_ID')
# IG_ACCOUNT2_ID = os.environ.get('IG_ACCOUNT2_ID')

# def lambda_handler(event, context):
    
#     scenario = event.get('scenario', 'default')
    
#     try:
#         if scenario == 'instagram':
#             logger.info("Executing Instagram scenario.")
#             dailyPostToIG(IG_ACCOUNT2_ID)
#         elif scenario == 'twitter':
#             logger.info("Executing Twitter scenario.")
#             dailyPostToTwitter()
#         else:
#             logger.warning("No valid scenario provided.")
#     except Exception as e:
#         logger.error(f"An error occurred: {e}")
