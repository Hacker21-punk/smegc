-- Add DELETE policy for profiles table to allow users to delete their own profile
-- This addresses GDPR right to erasure requirements

CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (id = auth.uid());