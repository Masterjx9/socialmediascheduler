
export interface SocialMediaAccount {
    provider_user_id: string;  
    provider_name: string;
    account_name: string;
}
export type LinkedInExpiryInfo = {
  id: string;           // provider_user_id  (sub_id)
  accountName: string;  // friendly LinkedIn account name
  expiresSoon: boolean; // true = already expired OR will expire within 48 h
};

export interface HandleNewSignUpParams {
    provider: string;
    isCalendarVisible: boolean;
    setIsNewAccountVisible: (visible: boolean) => void; 
    setIsCalendarVisible: (visible: boolean) => void;
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>; 
    mode: 'insert' | 'update';
}

export const scheduleOptions = [
  'Next available day',
  'Every first of the month',
  'Every 15th of the month',
];