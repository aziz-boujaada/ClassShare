export type UserRole = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  study_program: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type PresentationStatus = 'draft' | 'published';

export type BlockType = 
  | 'summary'
  | 'key_points'
  | 'explanation'
  | 'code_snippet'
  | 'resource'
  | 'image';

export interface SummaryContent {
  text: string;
}

export interface KeyPointsContent {
  points: string[];
}

export interface ExplanationContent {
  markdown: string;
}

export interface CodeSnippetContent {
  language: string;
  code: string;
  explanation?: string;
}

export interface CodingChallengeCase {
  input: string;
  expected_output: string;
}

export interface CodingChallengeParticipant {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface CommunityMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface CommunityConversation {
  profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface GlobalCommunity {
  id: boolean;
  name: string;
  image_url: string | null;
  updated_at: string;
}

export interface GlobalCommunityMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export interface CodingChallenge {
  id: string;
  author_id: string;
  presentation_id: string | null;
  presentation_slug?: string | null;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  concepts: string[];
  problem: string;
  requirements: string[];
  constraints: string[];
  examples: CodingChallengeCase[];
  language: 'java' | 'python' | 'typescript' | 'javascript' | 'sql';
  runtime: string;
  starter_code: string;
  hints: string[];
  evaluation_criteria: string[];
  public_test_cases: CodingChallengeCase[];
  linked_section: string;
  created_at: string;
  participants?: CodingChallengeParticipant[];
}

export interface ResourceItem {
  title: string;
  url: string;
  description?: string;
}

export interface ResourceContent {
  resources: ResourceItem[];
}

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
}

export type BlockContentMap = {
  summary: SummaryContent;
  key_points: KeyPointsContent;
  explanation: ExplanationContent;
  code_snippet: CodeSnippetContent;
  resource: ResourceContent;
  image: ImageContent;
};

export interface PresentationBlock {
  id: string;
  presentation_id: string;
  block_type: BlockType;
  title: string | null;
  content: any; // BlockContentMap[BlockType]
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface Presentation {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  description: string | null;
  subject: string;
  tags: string[];
  presentation_date: string | null;
  original_url: string | null;
  cover_image_url: string | null;
  status: PresentationStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  author?: Profile;
  blocks?: PresentationBlock[];
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface Like {
  id: string;
  presentation_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  presentation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export type NotificationType = 'like' | 'comment' | 'milestone' | 'system';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  presentation_id: string | null;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
  presentation?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  study_program: string | null;
  published_presentations_count: number;
  total_likes_received: number;
  total_comments_received: number;
  solved_coding_challenges_count?: number;
  score: number;
  rank?: number;
}

export interface FilterOptions {
  search?: string;
  subject?: string;
  tag?: string;
  sort?: 'newest' | 'oldest' | 'most_liked' | 'most_commented';
  author_id?: string;
  status?: PresentationStatus;
}
