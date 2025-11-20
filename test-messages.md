1. Basic Creation:
   - "I need to remember to renew my apprentice license before Level 3"
   - "Can you add a reminder about practicing for the IP exam?"
   - "I want to track my first aid certification separately"
2. Level-Specific (testing specialization awareness):
   - "Add a note for me to study transformers in Level 4" (should attach to level-4-industrial if user is industrial)
   - "Remind me to get my confined space ticket before starting Level 2"
3. Multi-Parent (testing attachment to multiple nodes):
   - "I need a reminder to update my resume that applies to both Level 4 and Red Seal"
   - "Add a note about workplace safety that's relevant to Foundation and Level 1"
4. Natural/Casual Phrasing:
   - "hey can you make me a checklist item for buying new work boots"
   - "I should probably track when I need to do my toolbox talk presentation"
   - "Can you help me remember to ask my foreman about overtime hours?"
5. Edge Cases:
   - "Add something about fire alarm systems" (no specific level mentioned - should fuzzy match or use default)
   - "Remind me about getting my Class 5 driver's license" (unrelated to roadmap - tests fallback)
