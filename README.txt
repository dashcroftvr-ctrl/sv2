MUDDY — friendly, flirty, boot-loving character for Quest 3S
=======================================================================

WHAT'S IN THIS FOLDER
  index.html   the page
  app.js       the viewer, menu and all his behaviour
  banter.js    WHO HE IS AND EVERYTHING HE SAYS - name, flirty boot chat,
               boot jokes, a line for each move. Edit in any text editor.
  models/      muddy.glb (slimmed for the headset: 6 MB, all 20 moves)
  vendor/      the 3D engine (three.js) - nothing loads from the internet

IT MUST BE OPENED FROM AN https:// LINK (same as Gaz & Serg).
  Copy the whole folder to one of your Pi sites with HTTPS, e.g.
      /var/www/<your-site>/muddy/
  then open https://<your-site>/muddy/ in the Quest browser and press
  "Passthrough - in your room".

MUDDY'S BANTER (riggers, Timberlands, Chelsea boots)
  Walk up          he says hello ("Well hello there. Today just got better.")
  Hang around      he tells boot stories out loud, and now and then
                   asks "Want a boot joke? It's a charmer." - NOD for yes,
                   SHAKE your head for no (or poke him for yes)
  Look at boots    look down at his boots for a second and he notices
                   ("Eyes on the boots? Good taste.") - sparkles + hearts
  Hearts           float your way when he's flirting - and non-stop
                   during the Love You Dance
  Poke the boots   fingertip or controller on his boots: leather squeak
                   and he's outraged ("Oi! Those are Timberlands, sweetheart.")
  Poke him         chest / head - he flinches and has a word
  Poke 4x quickly  he loses it: "Right, you've had your fun. STOMP!"
  Get too close    "Personal space... I'll allow it."
  Stare at him     "Like what you see?"
  Every step       boots CLOMP on the floor with a puff of dust
  Pick a move      he comments on it ("Watch this... try not to swoon.")
  Boots! button    he shows them off with a stomp

IN THE HEADSET
  Animation menu   floats to your left: 20 moves + controls.
                   Press a button with your fingertip, or point a
                   controller (or pinch) and pull the trigger.
                   The current move is highlighted in yellow.
  Thumbstick       flick left / right = previous / next move
  Grip             hide / show the menu
  Point at him     + trigger (or pinch) = poke him from a distance
  Chat / Joke      on the menu - a story or a joke on demand
  Bring here       him back in front of you, menu back beside you
  Turn 45°         spin him round to see him from another side
  Spot: on/off     ON  = everything plays on the spot (default)
                   OFF = Walk / Run / Excited Walk / Look Around make
                         him actually walk around your room. He keeps
                         about a metre away from you and turns back
                         before wandering off.
  Speed            1x -> 1.5x -> 0.5x
  Exit             leave passthrough/VR

ON A PC
  Click a move in the list, arrow keys = next / previous move,
  click him (or his boots) to poke, Y / N to answer a joke offer,
  drag to look around.

VOICE
  He speaks with the browser's built-in voice. If the Quest browser
  has no English voice he still chats in speech bubbles, silently.
  "Sound" on the menu mutes voice and clomps.

USING ANOTHER CHARACTER
  Any Meshy (Mixamo-rigged) GLB with animations works: put it in
  models/ and change model + name in banter.js (CHARACTER). Button names are
  tidied up automatically from the animation names.
