// Long-tail landing pages for the Typing Test flagship. Each embeds the same
// engine (components/tools/typing-speed-test) preset to a mode, but carries its
// OWN unique copy so the pages are genuinely distinct, never templated
// duplicates. Do not merge two pages' copy.
export const LANDING_UPDATED = "2026-09-07";

// SAFETY GATE: /typing-test/for-kids is hidden — it 404s, is excluded from the
// sitemap, and no page links to it — until AdSense is approved, to avoid any
// child-directed / COPPA complication during review. Flip to true AFTER approval
// to bring the page back everywhere at once; do it alongside the word-engine
// switch (lib/wordSeo.js PROGRAMMATIC_INDEX_ENABLED) so the "go live" step is one
// deliberate moment.
export const KIDS_PAGE_ENABLED = false;

export const TYPING_LANDING = {
  "wpm-test": {
    "url": "/wpm-test",
    "crumbName": "WPM Test",
    "mode": "words",
    "duration": 60,
    "siblings": [
      {
        "name": "Typing Practice",
        "url": "/typing-practice"
      },
      {
        "name": "1-Minute Typing Test",
        "url": "/typing-test/1-minute"
      },
      {
        "name": "5-Minute Typing Test",
        "url": "/typing-test/5-minute"
      }
    ],
    "h1": "WPM Test — Measure Your Words Per Minute",
    "seoTitle": "WPM Test: Check Your Words Per Minute Free",
    "metaDescription": "Take a free WPM test and see your true words per minute. 60-second words test with live WPM, accuracy, and a per-key error heatmap. No sign-up, runs in your browser.",
    "lede": "One 60-second words test that turns your typing into a single, comparable number — your words per minute.",
    "about": "This WPM test measures exactly what its name promises: your words per minute, calculated the standard way every serious typing benchmark uses. Correct characters divided by five (the accepted length of an average word), divided by the minutes you typed. That definition matters, because a \"word\" here isn't a real dictionary word — it's a fixed five-keystroke unit, so a short word like \"cat\" and a long word like \"elephant\" both contribute proportionally to your score. Fixing the word length at five is what makes one person's 62 WPM directly comparable to another's, whether they typed easy words or hard ones. The test is preset to Words mode for 60 seconds, the format most schools, employers, and typing sites treat as the default WPM benchmark.\n\nAs you type an endless stream of common English words, a live WPM counter and an accuracy percentage update in real time, and a countdown ticks down from sixty. When time runs out you get more than a number: a WPM-over-time graph shows whether you started fast and faded or built up speed, and a per-key error heatmap highlights which keys you actually missed most — often the same handful of letters dragging your accuracy down every run. Your best score for this mode and your recent runs are saved on your own device so you can watch the number move. If raw words feel artificial, the punctuation and numbers toggles add commas, capitals, and digits to make the stream read more like real writing.\n\nA quick word on what the number means. Around 40 WPM is a typical adult average; 60 to 80 WPM is genuinely fast and clears the bar for most typing-based jobs; 90 and above is professional-transcriptionist territory. But a high WPM with low accuracy is misleading — because the formula counts only correct characters, sloppy typing quietly caps your score no matter how fast your fingers move. Chase clean, accurate keystrokes first and speed tends to follow. This is one preset of the same Typing Test engine; if you want to drill deliberately rather than just measure, the Typing Practice page is built for that, and the 1-Minute Typing Test covers the same 60-second format with a focus on repeatable quick benchmarks.",
    "faq": [
      {
        "q": "What is a WPM test?",
        "a": "A WPM test measures how many words per minute you can type accurately. This one runs for 60 seconds in Words mode: you type a stream of common words while a live counter tracks your speed and accuracy, then reports your final words-per-minute score with a graph and a per-key error heatmap. It runs entirely in your browser with no sign-up."
      },
      {
        "q": "How is words per minute actually calculated?",
        "a": "WPM = correct characters ÷ 5 ÷ minutes. Every five correct keystrokes count as one 'word,' regardless of the actual words on screen, and the total is divided by how long you typed. Fixing a word at five characters is the industry standard — it's what makes scores comparable between people who typed different words."
      },
      {
        "q": "What is a good WPM score?",
        "a": "About 40 WPM is a common adult average. 60 to 80 WPM is fast and comfortably clears most job requirements. 90 WPM and above is professional level, the range you'd expect from transcriptionists and heavy keyboard users. Beginners often start in the 20 to 30 range, which is completely normal and rises quickly with practice."
      },
      {
        "q": "Why is my WPM lower than I expected?",
        "a": "Because the formula only counts correct characters, every mistake you don't fix pulls your score down. Someone hammering keys at 90 WPM raw but making frequent errors can end up scoring well below someone slower and cleaner. Check the accuracy percentage and the error heatmap after your run — tightening accuracy usually raises WPM more than trying to move your fingers faster."
      },
      {
        "q": "Is 60 seconds long enough for an accurate result?",
        "a": "Yes — 60 seconds is the standard WPM benchmark length used almost everywhere, long enough to smooth out a lucky or unlucky start but short enough to repeat easily. Run it a few times and look at your average rather than a single best. For a stamina reading over a longer stretch, the 5-Minute Typing Test measures sustained speed instead."
      },
      {
        "q": "Does this WPM test work without an account or internet upload?",
        "a": "Everything runs client-side in your browser. Nothing is uploaded, there's no login, and no results leave your device. Your best score per mode and recent-run history are stored locally with your browser's on-device storage, so they persist between visits but stay private to you."
      },
      {
        "q": "Should I turn on the punctuation and numbers toggles?",
        "a": "For a clean baseline WPM comparable to other sites, leave them off — plain lowercase words are the standard. Turn punctuation and numbers on when you want a result closer to real-world typing, since commas, capital letters, and digits force reaches and shift keys that a pure-lowercase stream never tests."
      },
      {
        "q": "How can I raise my words-per-minute score?",
        "a": "Prioritize accuracy over raw speed, keep your eyes on the screen instead of the keyboard, and use the error heatmap to spot the specific keys you keep missing. Retest regularly and track your saved bests to confirm progress. For structured, repeatable drilling rather than one-off measurement, use the Typing Practice page built on this same engine."
      }
    ],
    "howto": [
      "Leave the test on its default Words mode and 60-second timer — the standard setup for a comparable WPM score.",
      "Start typing the stream of words the moment you press the first key; the countdown and your live WPM begin automatically.",
      "Type accurately rather than frantically — only correct characters count toward words per minute, so mistakes you leave uncorrected lower your result.",
      "When the 60 seconds end, read your final WPM, accuracy, the WPM-over-time graph, and the per-key error heatmap to see what slowed you down.",
      "Retake it a few times, compare against your saved best for the mode, and toggle punctuation or numbers on when you want a tougher, more realistic benchmark."
    ]
  },
  "typing-practice": {
    "url": "/typing-practice",
    "crumbName": "Typing Practice",
    "mode": "words",
    "duration": 60,
    "siblings": [
      {
        "name": "WPM Test",
        "url": "/wpm-test"
      },
      {
        "name": "1-Minute Typing Test",
        "url": "/typing-test/1-minute"
      },
      {
        "name": "Typing Test for Kids",
        "url": "/typing-test/for-kids"
      }
    ],
    "h1": "Typing Practice: Build Real Speed One Minute at a Time",
    "seoTitle": "Typing Practice — Free Touch Typing Drills",
    "metaDescription": "Free typing practice with a 60-second Words drill. Build touch typing speed, fix your weakest keys with an error heatmap, and track your best WPM on-device.",
    "lede": "A free, browser-based typing practice drill that turns 60 focused seconds into steady, measurable speed gains — no sign-up, nothing uploaded.",
    "about": "Typing practice only works when it is short, repeatable, and honest about where you are losing time. This page presets our Typing Test to Words mode for 60 seconds: a rolling stream of common English words you can rerun as many times as you like. One clean minute is long enough to reveal your real pace and short enough that you will actually do it again — and again — which is the whole point. Speed comes from reps, not from one heroic attempt, so the drill is built to restart in a second and to be repeated daily.\n\nWhat makes this more than a stopwatch is the feedback you get the moment you finish. Every run draws a WPM-over-time graph so you can see whether you started fast and faded or built momentum, and a per-key error heatmap that shows exactly which keys you fumbled most. That heatmap is the single most useful thing for touch typing practice: instead of vaguely getting better, you can see that your right pinky keeps missing a reach, or that 't' and 'r' keep swapping, and then target those specific keys. Accuracy is not a side metric here — because WPM counts correct characters only (correct characters ÷ 5 ÷ minutes), sloppy fast typing scores worse than clean, controlled typing.\n\nYour progress lives on your own device. The tool saves your personal best per mode plus a short history of recent runs in your browser (localStorage), so you can open it tomorrow, type for a minute, and immediately see whether you beat yesterday. If you want to mark a milestone, the one-click Save result card exports a shareable PNG. If you would rather see where you currently stand before you start grinding, the sibling WPM Test page explains benchmarks and what counts as a good score; when you are ready to practise the symbols and brackets that prose never trains, the Code typing test drills those directly.",
    "faq": [
      {
        "q": "What is the best way to do typing practice to actually get faster?",
        "a": "Short, frequent, and feedback-driven beats long marathon sessions. Do a few 60-second Words runs daily, keep your eyes off the keyboard, and after each run use the error heatmap to pick two or three problem keys to focus on next time. Accuracy first, speed second — because WPM only counts correct characters, clean typing at a slightly slower pace will out-score fast, error-riddled typing every time."
      },
      {
        "q": "How is this different from touch typing practice on other sites?",
        "a": "The value is in the diagnostics. Most drills just give you a number; here every run produces a per-key error heatmap plus a WPM-over-time graph, so you can see which specific keys and which moments in the minute are costing you. That turns vague practice into targeted practice, which is what closes the gap between hunt-and-peck and true touch typing."
      },
      {
        "q": "How long until typing practice shows results?",
        "a": "Most people feel more comfortable within one to two weeks of daily minutes and see a measurable WPM bump — often 10 to 20 words per minute over a few weeks — as long as they keep their fingers on the home row instead of looking down. Because your personal best and recent runs are saved on-device, you can watch that curve for yourself rather than guessing."
      },
      {
        "q": "Why is the practice drill set to 60 seconds of Words?",
        "a": "One minute is the sweet spot for repetition: long enough to reveal your true steady-state pace, short enough that you will happily run it five times in a session. Words mode uses common English words so you are training real muscle memory rather than memorising one fixed passage. If you specifically want a repeatable one-minute benchmark, our 1-Minute Typing Test uses the same preset with that framing."
      },
      {
        "q": "Should I fix mistakes while I practise, or keep going?",
        "a": "During the drill, keep going — stopping to backspace breaks your rhythm and hides your natural error pattern. Let the heatmap catch your mistakes for you at the end, then slow down deliberately on those specific keys in your next run. Controlled, accurate reps build the habit; frantic correction does not."
      },
      {
        "q": "Do I need to sign up or does my practice history get uploaded?",
        "a": "No. The entire tool runs in your browser with no account and no sign-up. Your best scores and recent-run history are stored locally on your device via localStorage and nothing is uploaded anywhere. Clearing your browser data will reset your saved history, so export a result card PNG if you want to keep a milestone."
      }
    ],
    "howto": [
      "Start the 60-second Words drill and type the stream of words as they scroll — do not stop to fix mistakes; keep your rhythm and let accuracy settle naturally.",
      "Rest your fingers on the home row (ASDF and JKL;) and rely on the F and J bumps to reset without looking — the core habit of touch typing practice.",
      "When time is up, read your per-key error heatmap and note the two or three keys you missed most; those are your targets for the next run.",
      "Repeat the minute three to five times in a session, watching the WPM-over-time graph flatten out as your pace becomes steadier and more even.",
      "Check your saved best after each session to confirm you are trending up, and export a Save result card PNG whenever you hit a new personal best."
    ]
  },
  "typing-test/1-minute": {
    "url": "/typing-test/1-minute",
    "crumbName": "1-Minute Typing Test",
    "mode": "words",
    "duration": 60,
    "siblings": [
      {
        "name": "WPM Test",
        "url": "/wpm-test"
      },
      {
        "name": "5-Minute Typing Test",
        "url": "/typing-test/5-minute"
      },
      {
        "name": "Typing Practice",
        "url": "/typing-practice"
      }
    ],
    "h1": "1-Minute Typing Test",
    "seoTitle": "1-Minute Typing Test — Quick & Free",
    "metaDescription": "Take a free 1-minute typing test right in your browser. Get your WPM and accuracy in 60 seconds, repeat instantly, and track your best. No sign-up.",
    "lede": "Sixty seconds, one clean WPM number, and you can go again the moment it ends.",
    "about": "This 1-minute typing test drops you into a 60-second Words run: a steady stream of common English words, a live WPM counter, a running accuracy percentage, and a countdown ticking from 1:00 to zero. When the clock hits zero it stops on its own and hands you a result — no button to hunt for, no page to reload. One minute is the length most typing tests and job screens quote a WPM from, which is exactly why it's the number worth knowing: long enough to smooth out a lucky or unlucky opening line, short enough that you'll happily run it five times in a row.\n\nBecause a single 60-second sample still has some noise in it, this page is built for repeating. Every run saves to your device (in your browser's localStorage — nothing is uploaded), so your personal best for the 1-minute Words mode and your recent history sit right there to beat. The finish screen also draws a WPM-over-time graph so you can see whether you started fast and faded, and a per-key error heatmap that shows which keys cost you accuracy — the two things a raw WPM number hides. If your speed swings a lot between runs, that's normal at the one-minute length; take the median of three or four rather than your single best.\n\nWant to change the terms of the test? Toggle punctuation and numbers on for a harder, more realistic minute, or step sideways to a sibling page: try the 5-Minute Typing Test when you want an endurance read of your sustained speed under fatigue, or the WPM Test if you just want the standard benchmark explained. All of them run the same engine — this one is simply pinned to the quick, repeatable 60-second version.",
    "faq": [
      {
        "q": "How long is this typing test?",
        "a": "Exactly one minute. It starts the instant you type your first character and stops automatically when the 60-second countdown reaches zero — you don't press anything to end it. Your WPM and accuracy appear the moment the clock runs out."
      },
      {
        "q": "Why is a 1-minute typing test the standard length?",
        "a": "One minute is long enough to average out a fast or shaky opening line but short enough to repeat easily, so it gives a stable WPM without wearing you out. It's also the length most schools, job screens, and typing certificates quote speeds from, which makes your number directly comparable to those."
      },
      {
        "q": "What's a good WPM on a 1-minute test?",
        "a": "Around 40 WPM is average, 60–80 is genuinely fast, and 90+ is professional-typist territory. WPM here is correct characters divided by 5, divided by the minute — so accuracy counts. A clean 55 WPM often beats a sloppy 70 once errors are subtracted."
      },
      {
        "q": "Can I take the quick typing test again right away?",
        "a": "Yes — that's the point of the one-minute format. When a run ends you can restart immediately, and each result is saved on your device so your best 1-minute score and recent runs are always there to beat. Running it three or four times and taking the median gives a truer read than any single attempt."
      },
      {
        "q": "Is one minute long enough to measure my typing speed accurately?",
        "a": "For a snapshot, yes; for a reliable figure, run it a few times. A single 60-second sample carries some luck, so your speed will bob up and down between attempts. The WPM-over-time graph on the results screen also shows whether you held a steady pace or slowed down as the minute went on."
      },
      {
        "q": "Does this quick typing test work without signing up?",
        "a": "Completely. Everything runs in your browser — no account, no download, nothing uploaded. Your best scores and history live only on your own device via localStorage, so clearing your browser data resets them."
      },
      {
        "q": "How do I get a higher WPM in 60 seconds?",
        "a": "Prioritise accuracy over raw speed — every mistyped character is subtracted, so a smooth, error-light minute usually scores higher than a frantic one. Check the per-key error heatmap after each run to see which keys keep tripping you up, then focus on those. For daily drills to raise your ceiling over time, the Typing Practice page is built for that."
      },
      {
        "q": "What text does the 1-minute test use?",
        "a": "A continuous, randomised stream of common English words in Words mode, so you never run out before the clock does. You can toggle punctuation and numbers on for a tougher, more true-to-life minute, or switch to Quote, Code, or Custom modes on the main Typing Test if you'd rather type a set passage."
      }
    ],
    "howto": [
      "Leave the test on its default Words mode with the timer set to 60 seconds — it's already preset for the 1-minute test.",
      "Start typing the words as they appear; the countdown, your live WPM, and your accuracy begin the moment you hit the first key.",
      "Keep going until the clock reaches zero — the test ends by itself, no button needed.",
      "Read your result: final WPM, accuracy, a WPM-over-time graph, and a per-key error heatmap showing which keys cost you.",
      "Restart and repeat a few times, then take the median of your runs — your best 1-minute score is saved on-device to beat."
    ]
  },
  "typing-test/5-minute": {
    "url": "/typing-test/5-minute",
    "crumbName": "5-Minute Typing Test",
    "mode": "words",
    "duration": 300,
    "siblings": [
      {
        "name": "1-Minute Typing Test",
        "url": "/typing-test/1-minute"
      },
      {
        "name": "WPM Test",
        "url": "/wpm-test"
      },
      {
        "name": "Code Typing Test",
        "url": "/typing-test/code"
      }
    ],
    "h1": "5 Minute Typing Test",
    "seoTitle": "5 Minute Typing Test — Free Endurance WPM Test",
    "metaDescription": "Free 5 minute typing test that measures sustained WPM and accuracy over 300 seconds. See where your speed fades, track your best, no sign-up. In-browser.",
    "lede": "Five minutes on the clock, one endless stream of words — the honest measure of how fast you type when the sprint turns into a marathon.",
    "about": "Most typing tests are 60-second sprints, and almost anyone can hold a burst of speed for a minute. This 5 minute typing test is a different animal: 300 seconds of continuous words, long enough for the adrenaline to wear off and your true, repeatable pace to show. It runs on the same Typing Test engine as the rest of everyboringtool.com, preset here to Words mode at 5 minutes, streaming common words with optional punctuation and numbers if you want to raise the difficulty. WPM is the standard measure — correct characters divided by five, divided by minutes — so a longer test doesn't inflate or deflate the number; it just gives you a far more stable one.\n\nThe reason five minutes matters is endurance. Over a single minute you can power through on tension and focus. Over five, your hands fatigue, your attention drifts, and the small errors you'd normally ignore start compounding. That's exactly what the test is built to expose. As you type, live WPM and accuracy update and the count-up timer climbs toward 5:00, so you can feel your pace holding — or sliding — in real time. When you finish, the WPM-over-time graph is the payoff: a flat line means real stamina, while a curve that droops in the back half tells you your sustained speed is lower than your peak, which is the number that actually counts for real work.\n\nThis is the page to use when consistency over time is what's being tested — data-entry and transcription assessments, timed office typing exams, and any job screen that runs longer than a quick minute all reward steady output, not a fast start. The per-key error heatmap shows which keys cost you most as you tired, your best 5-minute run and recent history are saved on your device via localStorage, and a one-click 'Save result card' PNG captures the whole thing to share or submit. Everything is client-side, no account, nothing uploaded. If five minutes feels like a lot to start with, warm up on the sibling 1-minute typing test first, then come back here to prove you can hold it.",
    "faq": [
      {
        "q": "What is a 5 minute typing test?",
        "a": "It's a typing test that runs for a full 300 seconds instead of the usual 60. You type a continuous stream of common words the whole time while the tool tracks WPM and accuracy live. The extra length measures endurance and sustained speed rather than a short burst, so the final number reflects the pace you can actually hold, not your one-minute peak."
      },
      {
        "q": "Why take a 5 minute test instead of a 1 minute one?",
        "a": "A single minute rewards a fast start; five minutes rewards stamina. Fatigue, drifting focus and compounding small errors only show up once you're a few minutes in, so a longer test gives a much more stable, honest WPM. Use the 1-minute typing test for a quick benchmark or warm-up, and this 5-minute test when you need to prove you can sustain that speed."
      },
      {
        "q": "What is a good WPM over 5 minutes?",
        "a": "Sustained speed tends to run a little below your one-minute peak. Around 40 WPM is average, 60–80 is fast, and 90+ is professional territory — but holding any of those flat across five full minutes is the real achievement. Check the WPM-over-time graph after your run: a flat line means genuine endurance, while a drooping back half means your sustained pace is lower than your best sprint."
      },
      {
        "q": "Is this good practice for a typing exam or assessment?",
        "a": "Yes. Many data-entry, transcription and office typing exams run several minutes precisely to test consistency, so a 5-minute run is realistic preparation. Turn on the punctuation and numbers toggles to mirror harder assessment text, and repeat the test to see whether your accuracy and pace stay steady deep into the clock."
      },
      {
        "q": "How is the WPM calculated on the 5 minute test?",
        "a": "The same standard formula as every mode: correct characters divided by 5, divided by the minutes elapsed. Because it's normalized to time, running for five minutes instead of one doesn't inflate or shrink your score — it simply averages your speed over a longer, more representative window, which is why the result is harder to fluke."
      },
      {
        "q": "Does the 5 minute test save my best score?",
        "a": "Yes. Your best 5-minute run and a history of recent attempts are stored locally in your browser via localStorage, kept separate from your other modes, so you can watch your endurance number climb over repeated sessions. You can also save a result card PNG of any run to keep or submit. Nothing is uploaded and no sign-up is needed."
      },
      {
        "q": "What does the error heatmap show after a long test?",
        "a": "It highlights which keys you mistyped most across the whole five minutes. Over a longer test this is especially telling, because the keys that slip as your hands tire — often reaches to the top row, numbers or punctuation — stand out clearly. Fixing those recurring misses is one of the fastest ways to raise sustained accuracy."
      },
      {
        "q": "Can I use my own text for a 5 minute test?",
        "a": "This page is preset to Words mode for a fair, repeatable 5-minute benchmark, but the same Typing Test also has a Custom mode where you can paste your own passage and type it against a count-up timer. Use Words here for a comparable score, and Custom when you want to rehearse specific material at length."
      }
    ],
    "howto": [
      "Start typing as soon as the words appear — the 5-minute count-up timer begins on your first keystroke, streaming common words continuously.",
      "Optionally switch on the punctuation and numbers toggles beforehand to make the passage harder and closer to real assessment text.",
      "Aim for a steady, sustainable pace rather than a fast sprint; watch live WPM and accuracy and try to keep them level as the clock climbs toward 5:00.",
      "When the test ends, read the WPM-over-time graph to see whether your speed held flat or drooped, and check the heatmap for keys that slipped as you tired.",
      "Save your result card PNG or let your best 5-minute run store on-device, then repeat to push your sustained speed higher over time."
    ]
  },
  "typing-test/for-kids": {
    "url": "/typing-test/for-kids",
    "crumbName": "Typing Test for Kids",
    "mode": "words",
    "duration": 30,
    "siblings": [
      {
        "name": "Typing Practice",
        "url": "/typing-practice"
      },
      {
        "name": "1-Minute Typing Test",
        "url": "/typing-test/1-minute"
      },
      {
        "name": "WPM Test",
        "url": "/wpm-test"
      }
    ],
    "h1": "Typing Test for Kids and Students",
    "seoTitle": "Typing Test for Kids & Students — Free",
    "metaDescription": "A free typing test for kids and students: one short, friendly 30-second round on common words. No sign-up, no ads in the way, nothing uploaded. Just press start and type.",
    "lede": "A short, gentle 30-second typing test built for kids and students who are still learning where the keys are.",
    "about": "This typing test for kids and students is set to a friendly 30-second round on a stream of common, easy words — long enough to get a real score, short enough that a young learner does not lose focus or feel like they are being tested. There is no punctuation or number clutter to trip anyone up, no timer pressure beyond half a minute, and no sign-up wall between a child and pressing start. Every part of it runs inside the browser: nothing a student types is uploaded, saved to an account, or seen by anyone but them.\n\nAs the child types, the words per minute and accuracy update live so the effort feels like a game with instant feedback rather than a quiz with a grade at the end. When the 30 seconds are up, the result page is the encouraging part: a per-key heatmap quietly shows which letters got missed most (great for a parent or teacher to spot that the pinky keys or the letter 'b' need practice), a small speed graph shows the run, and the score is saved on the device as a personal best so the same child can try to beat their own number tomorrow instead of comparing against strangers. There is also a one-click 'Save result card' button that makes a shareable PNG — a nice little reward to show a parent or stick on the classroom wall.\n\nFor context on what to expect: an adult averages around 40 WPM, but children are still building the muscle memory, so a much lower number is completely normal and worth celebrating. Younger kids often land in the 10–20 WPM range, upper-elementary and middle-school students frequently reach 20–35 WPM, and a fluent touch-typing high-schooler can push toward the adult 40+ mark. The goal at this stage is accuracy and finding the keys without looking, not raw speed. When a student is ready for a longer benchmark, the same test offers a 1-minute round and a daily typing-practice mode as siblings on this site.",
    "faq": [
      {
        "q": "What is a good typing speed for kids and students?",
        "a": "It depends heavily on age. Younger children often type 10–20 WPM, upper-elementary and middle-school students commonly reach 20–35 WPM, and a confident high-school touch-typist can approach the adult average of 40 WPM or more. At every age, typing without looking down and keeping accuracy high matters far more than a fast number."
      },
      {
        "q": "Why is this typing test only 30 seconds?",
        "a": "Thirty seconds is long enough to produce a real, repeatable score but short enough to hold a young learner's attention and keep the experience feeling like a quick game rather than an exam. A child can do several rounds in a few minutes without getting frustrated. When they want a longer challenge, the 1-minute typing test on this site is the natural next step."
      },
      {
        "q": "Is it safe and free for children to use?",
        "a": "Yes. It is completely free, needs no sign-up or account, and asks for no personal information. Everything runs inside the browser, so nothing a child types is ever uploaded or shared — the words and scores stay on the device only. There are no pop-ups or distracting ads sitting on top of the typing area to get in the way."
      },
      {
        "q": "Can teachers use this in the classroom?",
        "a": "Absolutely. Because it is free, browser-based, and requires no logins, a whole class can open it at once on school Chromebooks or tablets. The short 30-second round fits a warm-up or a timed rotation, and the 'Save result card' PNG gives each student something to submit or display without any accounts to manage."
      },
      {
        "q": "Does it save my child's progress?",
        "a": "It saves a personal best and recent runs on the device using local browser storage, so the same child on the same computer can watch their own score improve over time. It does not sync to a cloud account or across devices — the history lives only in that browser, which keeps it private and simple."
      },
      {
        "q": "How can I help my child type faster?",
        "a": "Encourage them to keep their eyes on the screen instead of the keyboard, and use the per-key heatmap after each round to spot weak letters to focus on. Short, regular practice — a few 30-second rounds most days — builds muscle memory better than one long session. For a dedicated daily-practice routine, the typing-practice page on this site is built for exactly that."
      },
      {
        "q": "How is the WPM score calculated?",
        "a": "Words per minute is measured as the number of correct characters typed, divided by five (the standard length of one 'word'), divided by the minutes elapsed. Counting only correct characters means the score rewards accuracy, so a child who slows down slightly to hit the right keys will often score better than one who rushes and makes mistakes."
      },
      {
        "q": "My child scored very low — is that a problem?",
        "a": "Not at all. Kids are still learning where every key lives, so a low number early on is completely expected and not a sign of anything wrong. Treat the saved personal best as the thing to beat, celebrate small improvements, and keep the rounds short and fun. Speed comes naturally once the fingers know the layout."
      }
    ],
    "howto": [
      "Press start and let your child rest their fingers gently on the keyboard — no need to look down at the keys.",
      "Type the words as they appear on screen for 30 seconds; if a letter is wrong, they can keep going, the test tracks it automatically.",
      "When time is up, look at the WPM and accuracy together, and check the per-key heatmap to see which letters got missed the most.",
      "Tap 'Save result card' to keep a PNG of the score to show a parent or teacher, then try again to beat the saved personal best.",
      "Repeat a short round most days — steady daily practice beats one long session for building typing muscle memory."
    ]
  },
  "typing-test/code": {
    "url": "/typing-test/code",
    "crumbName": "Code Typing Test",
    "mode": "code",
    "duration": 60,
    "siblings": [
      {
        "name": "WPM Test",
        "url": "/wpm-test"
      },
      {
        "name": "Typing Practice",
        "url": "/typing-practice"
      },
      {
        "name": "5-Minute Typing Test",
        "url": "/typing-test/5-minute"
      }
    ],
    "h1": "Code Typing Test — Measure Your Real Programming Speed",
    "seoTitle": "Code Typing Test — Free Programming Speed Test",
    "metaDescription": "Free code typing test that measures your real programming speed on actual code snippets — brackets, symbols, and indentation included. No sign-up, runs in your browser.",
    "lede": "Type real code snippets — not prose — and see how fast you actually are when brackets, semicolons, and indentation are on the line.",
    "about": "This is the Code mode of the everyboringtool.com Typing Test, built for developers who want to know how fast they type the characters they actually work in. Instead of feeding you an endless stream of common English words, Code mode drops you into genuine code snippets — with the curly braces, parentheses, square brackets, angle brackets, semicolons, quotes, operators, and indentation that make programming feel completely different from typing a paragraph. Your live WPM and accuracy update as you go, and a count-up timer tracks how long the snippet takes rather than racing a countdown, because the goal here is finishing the block correctly, not surviving 60 seconds.\n\nCoding speed and prose speed are two different skills, and most typists are noticeably slower on code. The reason is simple: the symbol keys sit on the number row and around the edges of the keyboard, they demand the Shift key constantly, and there's no autocomplete to save you here — you type every character yourself. A person who cruises at 90 WPM on plain words often lands well below that on code, and that gap is exactly what this test exposes. WPM is still calculated the honest way — correct characters divided by 5, divided by minutes elapsed — so a run full of symbols is scored on the same scale as any other mode, letting you compare directly against your prose speed on the sibling pages.\n\nEverything runs entirely in your browser: no sign-up, nothing uploaded, and no account to create. When you finish a snippet you get a WPM-over-time graph, a per-key error heatmap that reveals which symbols keep tripping you up (very often it's the same three or four punctuation keys), your personal best for Code mode, and a history of recent runs saved on-device so you can watch your symbol accuracy climb over weeks. There's also a one-click Save result card button that exports a shareable PNG. If you'd rather warm up on plain words first, the WPM Test page runs a standard 60-second words benchmark; when you want to build raw daily speed, Typing Practice covers touch-typing technique.",
    "faq": [
      {
        "q": "What is a code typing test?",
        "a": "A code typing test measures how fast and accurately you type real programming code rather than plain English. This one loads genuine snippets containing brackets, operators, semicolons, quotes, and indentation, then scores your WPM the same way a normal typing test does — correct characters divided by 5, divided by minutes — so you can see your true speed on the characters you code with every day."
      },
      {
        "q": "Why is my coding speed slower than my normal typing speed?",
        "a": "Almost everyone types code slower than prose, and it's normal. Symbol keys live on the number row and the keyboard's edges, they require constant use of Shift, and there's no autocomplete inside a typing test to fill things in for you. A 90-WPM prose typist often drops well below that on code. The gap between your Code-mode result and your Words-mode result is a useful measure of how comfortable you are with symbols."
      },
      {
        "q": "What programming languages are in the test?",
        "a": "Code mode draws from real snippets across common languages, so you'll encounter the punctuation patterns of curly-brace languages (like JavaScript, C-style, and Java-style code) alongside other syntax. The point isn't to test one language's grammar — it's to drill the symbols and structures programmers hit constantly, such as brackets, parentheses, quotes, operators, and indentation."
      },
      {
        "q": "How is WPM measured on a code typing test?",
        "a": "Exactly like every other mode on this Typing Test: WPM equals your correct characters divided by 5, then divided by the minutes elapsed. Because code is dense with symbols and Shift presses, the same WPM figure represents harder work than it would on plain words — which is why comparing your code score to your prose score is so revealing."
      },
      {
        "q": "Does the test show which symbols I keep getting wrong?",
        "a": "Yes. When you finish a snippet, the per-key error heatmap highlights the exact keys you missed most, and for coders that's usually a handful of punctuation keys — brackets, the semicolon, quotes, or the Shifted number row. Seeing your worst keys mapped out tells you precisely what to drill, which is the fastest route to cleaner, faster code entry."
      },
      {
        "q": "Is there a timer, or do I type until the snippet ends?",
        "a": "Code mode uses a count-up timer rather than a countdown. You type the snippet all the way to its end, and the timer measures how long that took. This suits code better than a fixed clock because finishing a block correctly — brackets balanced, indentation right — matters more than how many characters you can hammer out before a buzzer."
      },
      {
        "q": "Do I have to type the indentation and spaces too?",
        "a": "Yes — indentation and spacing are part of the snippet, and accuracy counts each character, so tabs and leading spaces are scored just like letters and symbols. That's deliberate: real code depends on correct whitespace, and typing it as part of the test builds the muscle memory you actually use in an editor."
      },
      {
        "q": "Is my data saved or uploaded anywhere?",
        "a": "No. The whole test runs client-side in your browser with no sign-up and nothing sent to a server. Your personal best and recent runs for Code mode are stored on-device using your browser's local storage, so they stay on your machine. The Save result card button simply generates a PNG you can choose to share."
      }
    ],
    "howto": [
      "Choose Code mode (it's already preset on this page) and skim the snippet that loads — it's real code, complete with brackets and indentation.",
      "Start typing the first character. The count-up timer, live WPM, and accuracy begin the moment you type, so there's no separate start button to hunt for.",
      "Type every character exactly as shown, including symbols, quotes, semicolons, and the spaces or tabs used for indentation — accuracy counts each one.",
      "Finish the snippet to the end, then read your WPM-over-time graph and, most importantly, the per-key error heatmap to see which symbol keys cost you the most.",
      "Save your result card as a PNG or run another snippet — your best and recent-run history for Code mode are stored on-device so you can track symbol accuracy over time."
    ]
  }
};

// Pages hidden until AdSense approval (see KIDS_PAGE_ENABLED). When a key is
// gated: its route 404s, it stays out of the sitemap, and sibling/flagship links
// to it are filtered out.
const GATED_KEYS = KIDS_PAGE_ENABLED ? [] : ["typing-test/for-kids"];
export const HIDDEN_LANDING = new Set(GATED_KEYS);
export const HIDDEN_LANDING_URLS = new Set(GATED_KEYS.map((k) => TYPING_LANDING[k].url));
export function visibleLandingKeys() {
  return Object.keys(TYPING_LANDING).filter((k) => !HIDDEN_LANDING.has(k));
}

const OG = "/opengraph-image";
export function landingMetadata(cfg) {
  return {
    title: cfg.seoTitle,
    description: cfg.metaDescription,
    robots: { index: true, follow: true },
    alternates: { canonical: cfg.url },
    openGraph: { type: "website", url: cfg.url, title: cfg.seoTitle, description: cfg.metaDescription, images: [OG] },
    twitter: { card: "summary_large_image", title: cfg.seoTitle, description: cfg.metaDescription, images: [OG] },
  };
}
