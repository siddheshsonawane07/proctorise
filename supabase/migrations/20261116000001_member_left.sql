-- A student who leaves a class by choice, as opposed to one a teacher removed: they may join again
-- with the code. In its own migration because a new enum value cannot be used in the transaction
-- that adds it.
alter type public.member_status add value 'left';
