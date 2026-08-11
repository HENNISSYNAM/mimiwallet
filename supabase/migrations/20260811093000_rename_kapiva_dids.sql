-- Finish the rename inside stored data.
--
-- Device DIDs were minted as `did:kapiva:<uuid12>` and are printed verbatim on
-- the M2M device list and in the registration toast, so the old brand was still
-- reaching the screen even after every source file had been renamed. Only the
-- method segment changes; the unique suffix is preserved, so a DID still refers
-- to the same device.
--
-- Safe to run because nothing outside this database resolves these identifiers
-- yet — there is no external registry, and no signed credential embeds them.
UPDATE public.device_wallets
SET device_did = 'did:mimi:' || substring(device_did from 12)
WHERE device_did LIKE 'did:kapiva:%';
