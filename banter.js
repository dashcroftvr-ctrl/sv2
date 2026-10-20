/* =========================================================================
   MUDDY — who he is and everything he says. Edit freely.
   Friendly, flirty, playful boot banter: riggers, Timberlands, Chelseas.
   Keep lines under ~55 characters so they fit the speech bubble.
   ========================================================================= */

export const CHARACTER = {
  name: 'Muddy',                     // change his name here
  model: 'models/muddy.glb',
  accent: '#ff6fa8',                 // speech-bubble colour
  // friendly button names for his moves
  names: {
    Running: 'Run', Walking: 'Walk', All_Night_Dance: 'All-Night Dance', Angry_Ground_Stomp_2: 'Angry Stomp',
    Backflip_Jump: 'Backflip', Block2: 'Block', Boom_Dance: 'Boom Dance', Fast_Lightning: 'Lightning',
    Female_Walk_Pick_Put_In_Pocket: 'Find a Fiver', Groan_Holding_Stomach_in_Sleep: 'Tummy Ache',
    Hip_Hop_Dance_2: 'Hip Hop 1', Hip_Hop_Dance_3: 'Hip Hop 2', Indoor_Swing: 'Swing', Love_You_Pop_Dance: 'Love You Dance',
    OMG_Groove: 'OMG Groove', Stand_Up2: 'Stand Up 1', Stand_Up7: 'Stand Up 2', Victory_Fist_Pump: 'Fist Pump',
    Walk_to_Sit: 'Walk & Sit', air_squat: 'Air Squat',
  },
  noLook: /sleep|groan|backflip|walk_to_sit|stand_up/i,      // moves where he shouldn't turn his head to you
  loco: [[/^running$/i, 1.8], [/^walking$/i, 1.1], [/pocket/i, 0.7]], // moves that walk him round the room (m/s)
  flirtyMoves: /love_you/i,                                   // moves that send hearts your way
};

export const BANTER = {
  greet: [
    "Well hello there. Today just got better.",
    "Oh hiya, gorgeous. Come to see me?",
    "Alright, you. Nice of you to pop by.",
    "There you are! Was hoping you'd show up.",
  ],

  poke: ["Ooh, cheeky!", "Hands to yourself… or don't.", "Easy, tiger!", "Buy me a brew first!", "That tickles!"],
  pokeHead: ["Mind the hair — I did it for you.", "Not the face! Second-best feature. After the boots."],
  pokeBoots: [
    "Oi! Those are Timberlands, sweetheart.",
    "Careful — they're freshly muddied.",
    "Good taste. Those are my riggers.",
    "Touch the Chelseas and you're buying dinner.",
    "Mind the leather, darling!",
    "Fancy a pair? I know a shop.",
  ],
  annoyed: "Right, you've had your fun. STOMP!",

  close: ["Ooh, close enough to smell the boot polish.", "Personal space… I'll allow it.", "Bit forward, aren't you? I like it."],
  stare: ["Like what you see?", "Take a picture, it'll last longer.", "You've been staring… I don't mind."],

  lookBoots: [
    "Eyes on the boots? Good taste.",
    "Rigger boots. Built for hard graft.",
    "Go on, admire them. Polished them for you.",
    "They look better with a bit of mud on.",
    "Timbs today. Chelseas are for date night.",
    "Steel toe caps. Tough outside, soft in the middle. Like me.",
  ],
  showBoots: ["Feast your eyes, darling.", "Rate the boots out of ten. Go on.", "Mud, leather and charm. Full package."],

  topics: [
    ["Rigger boots are the best boots. Fight me.", "Pull-on, steel toe, built for mud.", "…And they look cracking down the pub."],
    ["Timberlands. Absolute classic.", "Wheat-coloured, chunky soles.", "Wore them on a first date once. Got a second date."],
    ["Chelsea boots are for date night.", "Sleek, smart, elastic sides.", "If I'm in Chelseas, you're getting dinner."],
    ["They say you can tell a lot from a man's boots.", "So what do mine say about me?", "Reliable, waterproof and fun at parties."],
    ["Muddy boots mean a good day.", "Clean boots mean I've got a date.", "So… shall I go polish them?"],
    ["Riggers, Timbs or Chelseas?", "Go on, pick one for me tonight.", "Actually — I'll wear all three. One at a time."],
    ["I've got a boot for every mood.", "Riggers for work, Timbs for weekends…", "…and Chelseas when someone's worth impressing."],
    ["Mates say I spend more on boots than haircuts.", "Have you SEEN the boots?", "Exactly."],
    ["You've got a lovely smile, you know.", "Almost as nice as fresh leather.", "…Big compliment, that, from me."],
    ["If you were a boot, you'd be a Chelsea.", "Smart, stylish… and you go with anything."],
    ["Stepped in a puddle on the way here.", "Riggers didn't even notice.", "Waterproof AND good-looking. Like their owner."],
  ],

  jokes: [
    ["What do you call a boot that's fallen in love?", "Head over heels."],
    ["Why did the muddy boot get the date?", "So down to earth."],
    ["Why don't Timberlands ever get lonely?", "They always come in pairs."],
    ["Why did the Timberland dump the wellie?", "Too clingy. And always wet."],
    ["What did the boot say to the cute stranger?", "'You've got me tongue-tied.'"],
    ["Why are rigger boots so good at dating?", "They've got real sole."],
    ["What's a Chelsea boot's favourite chat-up line?", "'Fancy slipping into something comfortable?'"],
    ["Why did the rigger boot blush?", "It saw the Chelsea boot's elastic sides."],
  ],
  askJoke: ["Want a boot joke? It's a charmer.", "Fancy a joke? I'll make you smile.", "Go on — let me make you laugh."],
  askHint: "Nod for yes · shake for no",
  jokeIntro: ["Right, here goes…", "Ready? You'll love this…"],
  afterJoke: ["Made you smile. Mission accomplished.", "Charming AND funny. Lucky you.", "I'm wasted on you… but I don't mind."],
  declined: ["Playing hard to get? I like it.", "Fine. I'll just stand here looking good.", "Your loss, gorgeous."],
  noAnswer: ["…I'll take that as a shy yes for later.", "Lost in my eyes, were you?"],
  interrupted: ["Rude! I was being charming!", "Oi, I was getting to the good bit!"],

  // said when you pick a move from the menu (matched on the animation name)
  moves: [
    [/love_you/i, "This one's for you. Don't tell anyone."],
    [/all_night/i, "Could dance all night. Got the boots for it."],
    [/omg/i, "OMG, look at these boots go!"],
    [/hip_hop/i, "Smooth moves, muddy boots."],
    [/boom/i, "Boom! Boots on the dancefloor."],
    [/stomp/i, "STOMP! Riggers were made for this."],
    [/backflip/i, "Watch this… try not to swoon."],
    [/block/i, "Can't touch this. Well… maybe you can."],
    [/lightning/i, "Fast as lightning, smooth as leather."],
    [/pocket/i, "Found a fiver! Drinks are on me."],
    [/groan/i, "Ugh… too many kebabs. Still look good though."],
    [/swing/i, "Swinging for the fences, darling."],
    [/stand_up/i, "Up I get. Boots first, charm second."],
    [/victory|fist/i, "Get in! Did you see that?"],
    [/walk_to_sit/i, "Pull up a chair. Stay a while."],
    [/squat/i, "Leg day. Boots stay on. Eyes on the form, please."],
    [/running/i, "Catch me if you can!"],
    [/walking/i, "Hear that? Boots on the march."],
  ],
};
