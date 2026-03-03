-- Create referral status enum
CREATE TYPE public.referral_status AS ENUM ('pending', 'completed', 'rewarded');

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status public.referral_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users insert own referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins manage referrals" ON public.referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

-- Insert 100 access codes
INSERT INTO public.access_codes (code, plan, max_uses, is_active, expires_at) VALUES
('GENIE-2BJF-G8UE', 'business', 1, true, now() + interval '365 days'),
('GENIE-2ENY-BEQF', 'business', 1, true, now() + interval '365 days'),
('GENIE-2UTT-TZVF', 'business', 1, true, now() + interval '365 days'),
('GENIE-3524-J7SH', 'business', 1, true, now() + interval '365 days'),
('GENIE-36M6-FQGW', 'business', 1, true, now() + interval '365 days'),
('GENIE-37Q7-LU8Y', 'business', 1, true, now() + interval '365 days'),
('GENIE-3BT8-8V3C', 'business', 1, true, now() + interval '365 days'),
('GENIE-3F4Q-9FQJ', 'business', 1, true, now() + interval '365 days'),
('GENIE-3H4S-PQYB', 'business', 1, true, now() + interval '365 days'),
('GENIE-3K4J-RP8C', 'business', 1, true, now() + interval '365 days'),
('GENIE-3KZV-6P4S', 'business', 1, true, now() + interval '365 days'),
('GENIE-3L4R-8QK6', 'business', 1, true, now() + interval '365 days'),
('GENIE-3R9Q-XH9Z', 'business', 1, true, now() + interval '365 days'),
('GENIE-3T6R-8E6T', 'business', 1, true, now() + interval '365 days'),
('GENIE-3U6L-4KQ9', 'business', 1, true, now() + interval '365 days'),
('GENIE-3Y6R-3V6U', 'business', 1, true, now() + interval '365 days'),
('GENIE-46A3-Z4LC', 'business', 1, true, now() + interval '365 days'),
('GENIE-4C8V-A7F8', 'business', 1, true, now() + interval '365 days'),
('GENIE-4E4J-8C2Y', 'business', 1, true, now() + interval '365 days'),
('GENIE-4F7M-3H7K', 'business', 1, true, now() + interval '365 days'),
('GENIE-4G7S-VS4F', 'business', 1, true, now() + interval '365 days'),
('GENIE-4H9K-J8E4', 'business', 1, true, now() + interval '365 days'),
('GENIE-4J6N-9C7Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-4JQ3-NV2Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-4K7Z-8P5B', 'business', 1, true, now() + interval '365 days'),
('GENIE-4L3M-8R5F', 'business', 1, true, now() + interval '365 days'),
('GENIE-4M4T-6N8V', 'business', 1, true, now() + interval '365 days'),
('GENIE-4N8Q-L6PK', 'business', 1, true, now() + interval '365 days'),
('GENIE-4P6V-3K9R', 'business', 1, true, now() + interval '365 days'),
('GENIE-4R7H-K7A3', 'business', 1, true, now() + interval '365 days'),
('GENIE-4S6E-6K8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-4T4H-6P2L', 'business', 1, true, now() + interval '365 days'),
('GENIE-4T6H-5X4U', 'business', 1, true, now() + interval '365 days'),
('GENIE-4U9G-8E7Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-4V4K-7Q9G', 'business', 1, true, now() + interval '365 days'),
('GENIE-4V6Y-9B3Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-4Y7H-P8Q5', 'business', 1, true, now() + interval '365 days'),
('GENIE-4Z3L-6T8Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-56G6-7C7M', 'business', 1, true, now() + interval '365 days'),
('GENIE-57Z7-RG6M', 'business', 1, true, now() + interval '365 days'),
('GENIE-58Y8-8S4U', 'business', 1, true, now() + interval '365 days'),
('GENIE-5A6V-4H6Z', 'business', 1, true, now() + interval '365 days'),
('GENIE-5B6T-8P6T', 'business', 1, true, now() + interval '365 days'),
('GENIE-5C7H-3Z4F', 'business', 1, true, now() + interval '365 days'),
('GENIE-5E3G-9K8Y', 'business', 1, true, now() + interval '365 days'),
('GENIE-5F7Q-7T8M', 'business', 1, true, now() + interval '365 days'),
('GENIE-5G6B-3R9Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-5H4L-9E8V', 'business', 1, true, now() + interval '365 days'),
('GENIE-5H9E-P4B8', 'business', 1, true, now() + interval '365 days'),
('GENIE-5K4F-8P3T', 'business', 1, true, now() + interval '365 days'),
('GENIE-5K8H-6V4R', 'business', 1, true, now() + interval '365 days'),
('GENIE-5L8F-4Z8Y', 'business', 1, true, now() + interval '365 days'),
('GENIE-5M6N-9V6P', 'business', 1, true, now() + interval '365 days'),
('GENIE-5N7F-6J7M', 'business', 1, true, now() + interval '365 days'),
('GENIE-5P7V-8K3F', 'business', 1, true, now() + interval '365 days'),
('GENIE-5Q7A-9E7B', 'business', 1, true, now() + interval '365 days'),
('GENIE-5S6K-7B8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-5T6P-8N6Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-5U3K-9G6M', 'business', 1, true, now() + interval '365 days'),
('GENIE-5V7Q-6K8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-5X7R-3Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-5Y7P-7M6T', 'business', 1, true, now() + interval '365 days'),
('GENIE-5Z6N-9K8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-62Q3-9J4T', 'business', 1, true, now() + interval '365 days'),
('GENIE-63R8-7K6H', 'business', 1, true, now() + interval '365 days'),
('GENIE-64E8-PQ9B', 'business', 1, true, now() + interval '365 days'),
('GENIE-67L9-4N7H', 'business', 1, true, now() + interval '365 days'),
('GENIE-68V6-7T6P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6B4T-9P6R', 'business', 1, true, now() + interval '365 days'),
('GENIE-6C7R-3K8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-6E7M-5Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6F7Q-8R3T', 'business', 1, true, now() + interval '365 days'),
('GENIE-6G3T-9K6P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6H7R-4Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6J4T-8P6R', 'business', 1, true, now() + interval '365 days'),
('GENIE-6K7P-3R8Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-6L7Q-9K3T', 'business', 1, true, now() + interval '365 days'),
('GENIE-6M7R-5P8Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-6N3T-7Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6P7Q-4R8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-6Q7R-9K3P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6R3T-8P6Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-6S7Q-3K8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6T7R-5Q8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-6U3T-9K6P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6V7Q-4R8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6X7R-8P3Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-6Y7Q-9K3P', 'business', 1, true, now() + interval '365 days'),
('GENIE-6Z7R-3Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-72G4-8P6Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-74H8-6K3P', 'business', 1, true, now() + interval '365 days'),
('GENIE-76K3-9Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-78M6-4R8H', 'business', 1, true, now() + interval '365 days'),
('GENIE-7A7Q-5P8Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-7B3T-9K6P', 'business', 1, true, now() + interval '365 days'),
('GENIE-7C7R-4Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-7E7Q-8P3Q', 'business', 1, true, now() + interval '365 days'),
('GENIE-7F7R-9K3P', 'business', 1, true, now() + interval '365 days'),
('GENIE-7G7Q-3Q8P', 'business', 1, true, now() + interval '365 days'),
('GENIE-7H7R-5Q8H', 'business', 1, true, now() + interval '365 days')
ON CONFLICT (code) DO NOTHING;