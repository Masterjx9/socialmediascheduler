
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

export const YOUTUBE_CATEGORIES: { id: number; name: string }[] = [
  { id: 1, name: 'Film & Animation' },
  { id: 2, name: 'Autos & Vehicles' },
  { id: 10, name: 'Music' },
  { id: 15, name: 'Pets & Animals' },
  { id: 17, name: 'Sports' },
  { id: 19, name: 'Travel & Events' },
  { id: 20, name: 'Gaming' },
  { id: 22, name: 'People & Blogs' },
  { id: 23, name: 'Comedy' },
  { id: 24, name: 'Entertainment' },
  { id: 25, name: 'News & Politics' },
  { id: 26, name: 'Howto & Style' },
  { id: 27, name: 'Education' },
  { id: 28, name: 'Science & Technology' },
  { id: 29, name: 'Nonprofits & Activism' },
  { id: 30, name: 'Movies' },
  { id: 31, name: 'Anime/Animation' },
  { id: 32, name: 'Action/Adventure' },
  { id: 33, name: 'Classics' },
  { id: 34, name: 'Comedy (Alt)' },
  { id: 35, name: 'Documentary' },
  { id: 36, name: 'Drama' },
  { id: 37, name: 'Family' },
  { id: 38, name: 'Foreign' },
  { id: 39, name: 'Horror' },
  { id: 40, name: 'Sci-Fi/Fantasy' },
  { id: 41, name: 'Thriller' },
  { id: 42, name: 'Shorts' },
  { id: 43, name: 'Shows' },
  { id: 44, name: 'Trailers' },
];
