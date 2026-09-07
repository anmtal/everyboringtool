// Long-tail landing pages for tools OTHER than the Typing Test (which has its own
// lib/typingLanding.js). Each embeds a tool engine preset via toolProps, with its
// OWN unique copy so pages are genuinely distinct. Rendered by
// components/ToolLandingPage.jsx. Keyed by "<tool-slug>/<variant>".
export const TOOL_LANDINGS = {
  "utm-builder/for-facebook": {
    "toolSlug": "utm-builder",
    "flagshipName": "UTM Builder",
    "flagshipUrl": "/marketing/utm-builder",
    "flagshipDesc": "The full builder — platform presets, bulk mode and the naming cleaner.",
    "clusterLabel": "UTM builders",
    "updated": "2026-09-07",
    "url": "/utm-builder/for-facebook",
    "crumbName": "for Facebook",
    "toolProps": {
      "initialSource": "facebook",
      "initialMedium": "paid_social"
    },
    "siblings": [
      {
        "name": "UTM for Email",
        "url": "/utm-builder/for-email"
      },
      {
        "name": "UTM for Google Ads",
        "url": "/utm-builder/for-google-ads"
      },
      {
        "name": "UTM Naming Convention",
        "url": "/utm-builder/naming-convention"
      }
    ],
    "h1": "UTM Builder for Facebook",
    "seoTitle": "UTM Builder for Facebook | Free Meta Link Tagger",
    "metaDescription": "Free UTM builder for Facebook. One click sets source=facebook, medium=paid_social. Tag Meta ad and organic links, clean values, and bulk-tag URLs.",
    "lede": "This UTM builder for Facebook tags any link you drop into a Meta ad, post, bio, or Story so it shows up correctly in Google Analytics 4 instead of hiding inside \"Facebook / referral\" or getting lost entirely. Click the Facebook preset and it fills utm_source=facebook and utm_medium=paid_social — the GA4-friendly convention — then you add your campaign name and copy a clean, tracked URL. It runs entirely in your browser: no sign-up, nothing uploaded, and your naming preference is saved on your device.",
    "about": "Facebook is one of the messiest sources in any analytics report, and the reason is referrer data. When someone taps your link inside the Facebook or Instagram app, the click often arrives with no referrer or with a garbage in-app browser referrer, so GA4 files the session under \"(direct)\", \"m.facebook.com\", or \"l.facebook.com\" — three different labels for the same traffic. UTM parameters override that guesswork. By stamping utm_source=facebook and utm_medium=paid_social onto the URL before you paste it into Ads Manager, you tell GA4 exactly where the visit came from, no matter how the app mangles the referrer. That is the whole job of this page: give Meta links an unambiguous, self-declared identity.\n\nThe preset here uses the medium paid_social on purpose, and it is worth being deliberate about it. Medium is the bucket GA4 groups channels by, so paid Facebook ads should read paid_social while your organic posts, bio link, and Stories should read social (or organic_social if that is your taxonomy). Mixing them — tagging an unpaid Reel as paid_social — quietly inflates your paid numbers and breaks the paid-versus-organic comparison you actually care about. When you tag an organic Meta link, keep utm_source=facebook but change the medium to social. When you tag an ad, leave it on paid_social. That single distinction is what lets you answer \"is my ad spend beating my free posting?\" honestly.\n\nA common question is whether UTMs collide with Meta's own fbclid parameter, and they do not. fbclid is a click identifier Meta appends automatically for its pixel and attribution — it lives in Meta's world and GA4 ignores it for channel grouping. Your utm_ parameters live in Google's world and are what GA4 reads. The two coexist on the same URL without interfering; this builder even preserves any existing query parameters (including an fbclid already on your base URL) rather than overwriting them, and it URL-encodes your values so campaign names with spaces or symbols do not break the link. This page is one preset of the same UTM Builder — see the sibling naming-convention page to lock in a taxonomy across your whole team, and the email page when you move from Meta to newsletter links.",
    "faq": [
      {
        "q": "What UTM source and medium should I use for Facebook ads?",
        "a": "Use utm_source=facebook and utm_medium=paid_social for paid Meta ads — that is exactly what this builder's Facebook preset fills in. The medium paid_social groups your spend correctly in GA4's default channel report. For organic posts, keep the source as facebook but switch the medium to social so free and paid traffic never blur together."
      },
      {
        "q": "Do UTM parameters conflict with Facebook's fbclid?",
        "a": "No. fbclid is Meta's own click identifier for its pixel and attribution; GA4 does not use it for channel grouping. Your utm_ parameters are what GA4 reads. Both can sit on the same URL at once — this builder preserves an existing fbclid on your base URL instead of stripping it, and adds your utm tags alongside it."
      },
      {
        "q": "How do I tag Instagram links if this is a Facebook preset?",
        "a": "Instagram and Facebook are both Meta, so the conventions are close. This builder has a dedicated Instagram preset, but many teams deliberately keep utm_source=facebook for both and separate them with utm_campaign or utm_content instead. Whatever you choose, be consistent — turn on Clean values so instagram and Instagram can never split into two sources."
      },
      {
        "q": "Why does Facebook traffic show up as direct or referral in GA4?",
        "a": "Because the Facebook and Instagram apps often send clicks with no referrer or an in-app referrer like l.facebook.com, so GA4 guesses — landing them under (direct), m.facebook.com, or various referral labels. Adding UTM parameters overrides that guess: the URL declares its own source and medium, so every Meta click lands in one clean bucket."
      },
      {
        "q": "What is the difference between paid_social and social as a medium?",
        "a": "paid_social is for links inside paid Meta ads; social (or organic_social) is for unpaid posts, Reels, Stories, and your bio link. Keeping them separate is what lets you compare ad performance against organic reach. Tagging an organic post as paid_social silently inflates your paid numbers, so change the medium when the link isn't behind ad spend."
      },
      {
        "q": "Can I tag many Facebook ad URLs at once?",
        "a": "Yes. Switch on bulk mode, paste one base URL per line, apply the same Facebook UTM parameters to all of them, then copy the whole set or download a CSV. It is built for tagging a batch of ad variations or a set of landing pages for one campaign without rebuilding each link by hand."
      },
      {
        "q": "What does the Clean values toggle do for Facebook tags?",
        "a": "It lowercases every value and swaps spaces for your chosen separator, so Facebook, facebook, and FaceBook all become one source and Summer Sale becomes summer_sale. UTM values are case-sensitive in GA4, so this is the single most important hygiene rule — it stops one campaign from fragmenting into several. The naming-convention sibling page covers this in depth."
      },
      {
        "q": "Should I use utm_content to tell my Facebook ad creatives apart?",
        "a": "Yes — utm_content is the right field for distinguishing versions of the same campaign, like carousel vs single-image or two headline tests. Keep utm_campaign as the campaign name and vary utm_content per creative. That way GA4 reports roll up under one campaign while still letting you see which specific ad drove the conversions."
      }
    ],
    "howto": [
      "Paste the destination URL you're promoting on Facebook into the base URL field — the builder validates that it's a proper http or https link.",
      "Click the Facebook preset to auto-fill utm_source=facebook and utm_medium=paid_social; if the link is an organic post rather than an ad, change the medium to social.",
      "Enter your utm_campaign name, and optionally add utm_content to label the specific ad creative or placement.",
      "Turn on Clean values and pick a separator so every tag is lowercased and spaces become underscores or hyphens, keeping facebook one consistent source.",
      "Copy the finished tracking URL into Ads Manager or your post — or switch to bulk mode to tag a whole batch of ad URLs and export them as a CSV."
    ]
  },
  "utm-builder/for-email": {
    "toolSlug": "utm-builder",
    "flagshipName": "UTM Builder",
    "flagshipUrl": "/marketing/utm-builder",
    "flagshipDesc": "The full builder — platform presets, bulk mode and the naming cleaner.",
    "clusterLabel": "UTM builders",
    "updated": "2026-09-07",
    "url": "/utm-builder/for-email",
    "crumbName": "for Email",
    "toolProps": {
      "initialSource": "newsletter",
      "initialMedium": "email"
    },
    "siblings": [
      {
        "name": "UTM for Facebook",
        "url": "/utm-builder/for-facebook"
      },
      {
        "name": "UTM for Google Ads",
        "url": "/utm-builder/for-google-ads"
      },
      {
        "name": "UTM Naming Convention",
        "url": "/utm-builder/naming-convention"
      }
    ],
    "h1": "UTM Builder for Email Campaigns",
    "seoTitle": "UTM Builder for Email — Tag Newsletter Links Free",
    "metaDescription": "Free UTM builder for email campaigns. Tag newsletter, Mailchimp, Klaviyo and HubSpot links with source=newsletter, medium=email so GA4 stops calling them direct traffic.",
    "lede": "This UTM builder for email tags every link in your newsletter with utm_source, utm_medium, and utm_campaign so the clicks show up as Email in your analytics instead of getting lost as anonymous direct traffic. Hit the Email preset once and it sets source=newsletter and medium=email following GA4 conventions; add a campaign name and copy your tagged URL.",
    "about": "Email is the one channel where tracking breaks by default. When someone clicks a link inside Gmail, Apple Mail, or the Outlook desktop app, the mail client usually strips the referrer, so your analytics has no idea the visit came from your newsletter. Those sessions get dumped into \"Direct / None\" alongside people who typed your URL by hand, and a campaign that actually drove sales looks like it did nothing. UTM parameters are the fix: they travel in the URL itself, survive the referrer being wiped, and tell GA4 exactly which email sent the click. That is the whole reason this page exists as a dedicated email preset rather than a generic tagger.\n\nThe Email preset here sets utm_source=newsletter and utm_medium=email — and the medium value matters more than people realize. GA4's default channel grouping only files a session under \"Email\" when utm_medium is literally \"email\", so if you type \"Email\", \"e-mail\", or \"eblast\" the traffic slips into \"Unassigned\" or a catch-all bucket. Keep the medium as email, use utm_source for where the send came from (newsletter, or your platform name like mailchimp, klaviyo, or hubspot), and reserve utm_campaign for the specific send — spring_sale, march_digest, cart_abandon_2. Because everything is optional beyond the source/medium/campaign trio, you can leave term blank and use utm_content to label which link inside the email was clicked.\n\nOne trap this tool helps you avoid: many email platforms add their own UTM tags automatically. Mailchimp's Google Analytics link tracking, Klaviyo's UTM tracking, and HubSpot's tracking can all append their own utm_source/utm_medium behind your back. If you also paste a manually tagged link, you end up with duplicate or conflicting parameters and inconsistent source names in your reports. Decide on one system — either let the platform tag automatically, or turn its auto-tagging off and tag manually here — and then keep the naming identical every time. The \"Clean values\" toggle lowercases everything and swaps spaces for your chosen separator, so Newsletter and newsletter never fracture into two different sources in your reports.",
    "faq": [
      {
        "q": "What is a UTM builder for email?",
        "a": "It is a free tool that appends utm_source, utm_medium, and utm_campaign tags to the links you put in a newsletter or email campaign, so your analytics can attribute those clicks to the specific email that sent them. This one preloads source=newsletter and medium=email with one click, URL-encodes every value, and builds the link in your browser — nothing is uploaded and there is no sign-up."
      },
      {
        "q": "Why do email links need UTM parameters at all?",
        "a": "Because email clients strip the referrer. When a subscriber clicks a link from inside Gmail, Apple Mail, or Outlook, the browser often arrives with no referrer information, so GA4 files the visit under Direct / None — the same bucket as people who typed your URL directly. UTM tags live in the URL, so they survive that referrer loss and let analytics see the click really came from your email."
      },
      {
        "q": "What source and medium should I use for email?",
        "a": "Use utm_medium=email exactly — GA4's default channel grouping only routes a session into the Email channel when the medium is the literal string email, so Email, e-mail, or eblast will miss it. For utm_source, use newsletter (the default here) or the sending context, such as your platform name (mailchimp, klaviyo, hubspot) or the list. Put the individual send in utm_campaign, like march_digest or welcome_series_2."
      },
      {
        "q": "Does Mailchimp or Klaviyo already add UTM tags automatically?",
        "a": "Often yes. Mailchimp's Google Analytics link tracking, Klaviyo's UTM tracking, and HubSpot's tracking can each append their own utm_source and utm_medium automatically. If you also add manual tags, you get duplicate or conflicting parameters and split source names in your reports. Pick one system: either rely on the platform's auto-tagging, or switch it off and tag manually here so you control the exact naming."
      },
      {
        "q": "How do I track which link inside the same email got clicked?",
        "a": "Use utm_content. When an email has a hero button, a text link, and a footer link all pointing to the same landing page, give each a different utm_content value — hero_button, text_link, footer_cta. The source, medium, and campaign stay identical, so the send is still counted as one campaign, but you can see which placement actually earned the clicks."
      },
      {
        "q": "Why does my email traffic still show as direct traffic in GA4?",
        "a": "Almost always because the links were untagged or tagged inconsistently. Without a utm_medium the referrer-stripped click has nothing to identify it, so it lands in Direct / None. Tagging every link with the Email preset fixes this. Inconsistent casing also fragments reports — this is where the Clean values toggle helps, and the sibling naming-convention page covers building one consistent taxonomy."
      },
      {
        "q": "Will UTM tags break Mailchimp merge tags or personalization?",
        "a": "No. UTM parameters are static text appended to the base URL and are set before any merge tag or dynamic content is resolved, so they coexist fine. The tool also preserves any parameters already on your URL, so a link that already carries a merge-tag query string keeps it and just gains the UTM tags on top."
      },
      {
        "q": "Can I tag a whole newsletter's links at once?",
        "a": "Yes. Switch to Bulk mode, paste every base URL from the email one per line, and the same source, medium, and campaign are applied to all of them. You can copy all the tagged links at once or download them as a CSV to drop into your email platform — handy for a digest with a dozen article links."
      }
    ],
    "howto": [
      "Click the Email preset to set utm_source=newsletter and utm_medium=email, keeping medium as the literal string email so GA4 files the clicks under its Email channel.",
      "Paste the link you are putting in the email into the Base URL field — the tool validates it is a real http or https URL and keeps any parameters already on it.",
      "Enter a utm_campaign for this specific send, like spring_sale or march_digest, and leave the naming lowercase so repeat sends stay consistent.",
      "If the email links to the same page more than once, add a utm_content value such as hero_button or footer_link to tell the placements apart, then copy the tagged URL into your email platform.",
      "For a full newsletter, switch to Bulk mode, paste every link one per line, apply the same tags to all, and copy them all or download the CSV."
    ]
  },
  "utm-builder/for-google-ads": {
    "toolSlug": "utm-builder",
    "flagshipName": "UTM Builder",
    "flagshipUrl": "/marketing/utm-builder",
    "flagshipDesc": "The full builder — platform presets, bulk mode and the naming cleaner.",
    "clusterLabel": "UTM builders",
    "updated": "2026-09-07",
    "url": "/utm-builder/for-google-ads",
    "crumbName": "for Google Ads",
    "toolProps": {
      "initialSource": "google",
      "initialMedium": "cpc"
    },
    "siblings": [
      {
        "name": "UTM for Facebook",
        "url": "/utm-builder/for-facebook"
      },
      {
        "name": "UTM for Email",
        "url": "/utm-builder/for-email"
      },
      {
        "name": "UTM Naming Convention",
        "url": "/utm-builder/naming-convention"
      }
    ],
    "h1": "UTM Builder for Google Ads",
    "seoTitle": "UTM Builder for Google Ads (google/cpc)",
    "metaDescription": "Free UTM builder for Google Ads. One click sets source=google, medium=cpc. Learn when manual UTMs help, and how to avoid gclid double-counting.",
    "lede": "This UTM builder for Google Ads tags your campaign URLs with the GA4-correct source=google and medium=cpc in one click, then URL-encodes every value so your tracking links do not break in the Google Ads editor.",
    "about": "Google Ads is the one channel where \"just add UTMs to everything\" is bad advice, and this page exists to keep you out of the most common reporting trap. When your Google Ads and GA4 (or Universal Analytics before it) accounts are linked and auto-tagging is on, Google appends a gclid to every ad click and GA reads it directly. GA already knows the click came from google / cpc, which campaign it belongs to, and far more granular detail than a UTM string can hold. Layering manual utm_source and utm_medium on top of that can override the gclid attribution and split one click into conflicting session sources, which is how \"double-counting\" and inflated paid-search numbers happen. So the honest default is: if auto-tagging is on and GA4 is your reporting tool, you usually do not need UTMs on Google Ads at all. Hit the Google Ads preset on this tool to set source=google and medium=cpc, and use it deliberately for the cases below, not by reflex.\n\nThe cases where manual tagging genuinely helps: you are sending clicks to a destination that GA cannot see the gclid in (some email tools, CRMs, third-party landing-page builders, or an analytics platform other than Google), auto-tagging is switched off, or you want a clean, human-readable source/medium in a tool that does not understand gclid. In those situations the google / cpc convention this preset writes is exactly what GA4 expects, so paid search stays grouped correctly instead of scattering into \"referral\" or \"unassigned.\" The one rule that matters most: never mix manual UTMs with auto-tagging on the same URL unless you have deliberately turned auto-tagging off, because the two systems fight and gclid usually wins in ways you cannot predict.\n\nIn Google Ads itself, do not paste tagged links straight into the Final URL field. Put your static UTMs in the account or campaign \"final URL suffix,\" and reserve the tracking template for redirect logic. That is also where Google's ValueTrack parameters live: {campaignid}, {adgroupid}, {keyword}, {network}, {device}, and friends resolve at click time, so you can push dynamic detail into utm_campaign or utm_content without hand-typing it per ad. This builder writes the static, human-decided part of that string, cleanly and consistently, and its Clean values toggle lowercases everything so google and Google never split into two sources; for the taxonomy rules behind that, see the sibling UTM Naming Convention page. It is part of the same UTM Builder that also has presets for Facebook, Email, LinkedIn, and more.",
    "faq": [
      {
        "q": "Should I use UTMs with Google Ads at all?",
        "a": "Often no. If auto-tagging is on and GA4 is linked, Google's gclid already tells GA the click came from google / cpc with full campaign detail, so manual UTMs are redundant and can conflict. Use manual UTMs mainly when auto-tagging is off, or when a non-Google tool (a CRM, email platform, or third-party analytics) needs a readable source/medium it can actually parse."
      },
      {
        "q": "What is the correct UTM source and medium for Google Ads?",
        "a": "utm_source=google and utm_medium=cpc. This is the GA4 convention that groups the traffic under Paid Search. This tool's Google Ads preset sets both in one click. Avoid variants like medium=ppc or medium=paid, which land in the wrong channel group and force you to write custom channel rules later."
      },
      {
        "q": "What is gclid double-counting and how do I avoid it?",
        "a": "When auto-tagging appends a gclid and you also add a manual utm_source/utm_medium to the same link, the two attribution systems can disagree, splitting one click across two session sources and inflating paid-search figures. Avoid it by choosing one method: keep auto-tagging on and skip manual UTMs, or turn auto-tagging off and tag manually. Never run both on the same URL by accident."
      },
      {
        "q": "Where do I put UTMs in Google Ads?",
        "a": "Not in the Final URL. Add static UTM parameters in the campaign or account 'final URL suffix' field so they persist through redirects, and use the tracking template only for redirect or click-measurement logic. Build the static string here, then paste it into the suffix field."
      },
      {
        "q": "Can I use ValueTrack parameters like {campaignid} in my UTMs?",
        "a": "Yes. Google's ValueTrack parameters ({campaignid}, {adgroupid}, {keyword}, {network}, {device}, {creative}) resolve at click time and can populate utm_campaign or utm_content dynamically. This builder writes the static, human-decided portion; you can append ValueTrack tokens in the final URL suffix so each ad reports its own detail without manual editing."
      },
      {
        "q": "How is a UTM different from the gclid Google adds?",
        "a": "gclid is Google's own encrypted click ID for auto-tagging, read natively by GA and Google Ads for full attribution and conversion import. UTMs are open, human-readable tags that any analytics tool can parse. gclid is richer inside Google's ecosystem; UTMs are portable everywhere else. That difference is exactly why you pick one and avoid stacking them."
      },
      {
        "q": "Does this Google Ads UTM builder upload my URLs anywhere?",
        "a": "No. Everything runs client-side in your browser. Base URLs and values are never uploaded, and your naming preferences (separator and Clean values setting) are saved on-device only. You can also paste many URLs in bulk mode, apply the same google/cpc tags to all, and download a CSV without anything leaving your machine."
      },
      {
        "q": "Why should I lowercase my Google Ads UTM values?",
        "a": "Because GA4 treats CPC and cpc, or Google and google, as different values, which fragments your reports. The Clean values toggle lowercases every value and swaps spaces for your chosen separator, so your paid-search data stays in one clean bucket. The UTM Naming Convention sibling page covers the full taxonomy."
      }
    ],
    "howto": [
      "Paste your ad's landing-page URL into the base URL field; the builder validates that it is a proper http or https link.",
      "Click the Google Ads preset to set utm_source=google and utm_medium=cpc following GA4 conventions.",
      "Add a utm_campaign, and optionally utm_content to tell ad variants apart; leave the Clean values toggle on so everything is lowercased with one consistent separator.",
      "Confirm auto-tagging is OFF for this destination (or that GA cannot read the gclid) so you do not double-count against Google's gclid.",
      "Copy the tagged URL into your Google Ads final URL suffix, or use bulk mode to tag many ad URLs at once and download a CSV."
    ]
  },
  "utm-builder/naming-convention": {
    "toolSlug": "utm-builder",
    "flagshipName": "UTM Builder",
    "flagshipUrl": "/marketing/utm-builder",
    "flagshipDesc": "The full builder — platform presets, bulk mode and the naming cleaner.",
    "clusterLabel": "UTM builders",
    "updated": "2026-09-07",
    "url": "/utm-builder/naming-convention",
    "crumbName": "Naming Convention",
    "toolProps": {},
    "siblings": [
      {
        "name": "UTM for Facebook",
        "url": "/utm-builder/for-facebook"
      },
      {
        "name": "UTM for Email",
        "url": "/utm-builder/for-email"
      },
      {
        "name": "UTM for Google Ads",
        "url": "/utm-builder/for-google-ads"
      }
    ],
    "h1": "UTM Naming Convention Builder & Free Template",
    "seoTitle": "UTM Naming Convention Generator + Free Template",
    "metaDescription": "A UTM naming convention builder that lowercases every value and enforces one separator, so Facebook and facebook never split. Free template, no sign-up.",
    "lede": "A UTM naming convention keeps your analytics clean by forcing every link to follow the same rules — this builder enforces them for you: it lowercases every value and swaps spaces for the separator you choose, so your source, medium, and campaign taxonomy stays consistent across every campaign and every teammate.",
    "about": "The single most expensive UTM mistake has nothing to do with which parameters you use — it is inconsistency. \"Facebook\" and \"facebook\" are two different sources to Google Analytics. \"email\" and \"Email\" are two different mediums. \"spring_sale\" and \"spring-sale\" are two different campaigns. Every time casing or spacing drifts, one real campaign fractures into two or three rows in your reports, and the traffic you actually earned gets split across them so nothing looks as good as it did. A naming convention is the fix, and this page is the enforcer for it. Turn on the Clean values toggle and the builder lowercases every value you type and replaces spaces with your chosen separator before it ever reaches the URL — the rule is applied mechanically, not left to whoever is pasting the link at 5pm on a Friday.\n\nA workable UTM naming convention comes down to a few decisions you make once and never revisit. Pick lowercase for everything, because analytics platforms treat values case-sensitively and humans are wildly inconsistent about capitals. Pick one separator — underscore or hyphen — and use it everywhere; mixing \"paid-social\" and \"paid_social\" produces the same split you were trying to avoid. Then fix a small, closed vocabulary for source and medium in particular: source is the platform (facebook, google, newsletter), medium is the channel type (paid_social, cpc, email, organic_social). Campaign, term, and content can be more free-form, but they still benefit from the same lowercase-and-separator hygiene so a filter like \"starts with spring\" actually catches everything. This builder saves your separator preference on-device, so the convention follows you into the next session without a spreadsheet to consult.\n\nThis is one preset of the same in-browser UTM Builder that powers the platform pages — everything runs client-side, nothing is uploaded, and there is no sign-up. Where the sibling pages start you inside a specific channel — the UTM Builder for Facebook loads the facebook / paid_social convention, and the UTM Builder for Email loads newsletter / email — this page is the convention layer that sits under all of them. Draft your taxonomy here with Clean values on, then use Bulk mode to paste a whole batch of base URLs and apply the same tidy parameters to every one at once, copying them all or downloading a CSV to hand to the team as the canonical link set.",
    "faq": [
      {
        "q": "What is a UTM naming convention?",
        "a": "A UTM naming convention is a fixed set of rules for how you write utm_source, utm_medium, utm_campaign and the optional utm_term and utm_content values, so every tagged link across your team looks the same. The core rules are: lowercase everything, use one separator (underscore or hyphen) consistently, and keep a small, agreed vocabulary for source and medium. This builder's Clean values toggle enforces the lowercase-and-separator part automatically."
      },
      {
        "q": "Why do casing and spaces break my analytics?",
        "a": "Google Analytics and most platforms treat UTM values as case-sensitive strings. \"Facebook\", \"facebook\", and \"FaceBook\" become three separate sources, and \"spring sale\" (with a raw space, which gets encoded as %20) reads differently from \"spring_sale\". Each variant is its own row in your reports, so one real campaign's traffic gets split across several rows and every version looks smaller than it truly was. Consistent naming keeps a campaign as a single, correctly-sized row."
      },
      {
        "q": "How does the Clean values toggle enforce the convention?",
        "a": "When Clean values is on, the builder takes each value you type and lowercases it, then replaces spaces with the separator you picked (underscore or hyphen), before appending it to the URL. So typing \"Spring Sale\" produces spring_sale or spring-sale, and \"Facebook\" always becomes facebook. It applies the rule mechanically to every value on every link, which is exactly the discipline humans fail at by hand."
      },
      {
        "q": "Should I use underscores or hyphens in UTM values?",
        "a": "Either works — what matters is that you pick one and never mix them. Underscores are the more common convention for UTM parameters and keep values visually distinct from the hyphens already in your slugs and campaign names. Hyphens are sometimes preferred for readability. The builder lets you choose the separator and then applies it to every value, so the decision only has to be made once."
      },
      {
        "q": "Is there a UTM naming convention template I can copy?",
        "a": "Yes — the convention itself is the template: source = the platform (facebook, google, newsletter, linkedin); medium = the channel type (paid_social, cpc, email, organic_social); campaign = a lowercase, separator-joined campaign name (spring_sale_2026); term = keyword or audience; content = the specific creative or link position. Set Clean values on, tag one link to establish the pattern, then use Bulk mode to apply it across a whole batch and download the CSV as your shared reference."
      },
      {
        "q": "How is this different from the platform UTM builder pages?",
        "a": "The platform pages — like the UTM Builder for Facebook and the UTM Builder for Email — preload a channel's source and medium so you can start tagging that channel immediately. This naming-convention page is the layer underneath all of them: it is about the rules every value follows, regardless of channel, and it leans on the Clean values toggle to enforce those rules. Use it to define your taxonomy, then let the platform presets fill in the source and medium."
      },
      {
        "q": "Can I apply my convention to many links at once?",
        "a": "Yes. Bulk mode lets you paste many base URLs, one per line, apply the same UTM parameters — cleaned to your convention — to all of them, and then copy them all or download a CSV. It is the fastest way to produce a consistent, convention-compliant link set for an entire campaign and share it with a team so nobody hand-types a variant."
      },
      {
        "q": "Does the tool remember my naming preference?",
        "a": "Your separator preference is saved on-device in your browser, so the convention carries over the next time you open the builder — no account and no spreadsheet needed. Everything runs client-side and nothing you type is uploaded anywhere."
      }
    ],
    "howto": [
      "Turn on the Clean values toggle and choose your separator — underscore or hyphen — so every value gets lowercased and space-cleaned automatically. This is the rule your whole convention hangs on.",
      "Enter your base URL, then fill in utm_source (the platform, e.g. newsletter), utm_medium (the channel type, e.g. email), and utm_campaign (a lowercase, separator-joined name like spring_sale_2026). Add utm_term or utm_content only if you need them.",
      "Watch the tagged URL update — every value appears lowercased and joined by your separator, so facebook never becomes Facebook and \"spring sale\" never becomes two campaigns. Copy the finished link.",
      "For a whole campaign, switch to Bulk mode: paste every base URL one per line, apply the same cleaned parameters to all of them, and download the CSV as your team's canonical, convention-compliant link set.",
      "Reuse the same source and medium vocabulary next time — your separator preference is saved on-device, so the convention follows you into the next session and stays consistent across campaigns."
    ]
  },
  "barcode-generator/code-128": {
    "toolSlug": "barcode-generator",
    "flagshipName": "Barcode Generator",
    "flagshipUrl": "/qr-barcode/barcode-generator",
    "flagshipDesc": "The full generator — 8 symbologies, bulk mode, ZIP & SVG export.",
    "clusterLabel": "barcode generators",
    "updated": "2026-09-07",
    "url": "/barcode-generator/code-128",
    "crumbName": "Code 128",
    "toolProps": {
      "initialFormat": "CODE128"
    },
    "siblings": [
      {
        "name": "EAN-13 / UPC Generator",
        "url": "/barcode-generator/ean-13"
      },
      {
        "name": "Bulk Barcode Generator",
        "url": "/barcode-generator/bulk"
      },
      {
        "name": "SVG / Vector Barcode",
        "url": "/barcode-generator/svg"
      }
    ],
    "h1": "Code 128 Barcode Generator",
    "seoTitle": "Code 128 Barcode Generator — Free CODE128 Maker",
    "metaDescription": "Free Code 128 barcode generator in your browser. Encode any text or number, validate, print a label sheet, and download PNG or vector SVG — no sign-up.",
    "lede": "This Code 128 barcode generator turns any text or number into a clean, scannable CODE128 barcode right in your browser — the go-to symbology for shipping labels, logistics, asset tags, and internal SKUs, with no sign-up and nothing uploaded.",
    "about": "The Code 128 barcode generator is preset to the CODE128 symbology, the workhorse of warehouses and back offices. Unlike retail codes that only accept digits, Code 128 encodes the full ASCII set — uppercase and lowercase letters, digits 0-9, and symbols like dashes, slashes, and dots. That makes it the right choice when your value is a mixed string: an order number like SO-48213, an asset tag such as IT/LAPTOP/0091, a location bin like A12-R4-S3, or an internal SKU that isn't a registered retail product. Type the value, watch the live preview redraw, set the size to Small, Medium, or Large, and keep or hide the human-readable text printed under the bars.\\n\\nCode 128 is also compact. It has a dense numeric mode (Code Set C) that packs pairs of digits into a single bar pattern, so a long number stays narrow enough to fit a shipping label or a spine sticker without wrapping. This tool uses jsBarcode's automatic mode, which switches between character sets for you to keep the barcode as short as it can be — you don't need to know or pick a subset. It draws true black bars on a white background at a scannable resolution, so the result holds up whether it comes off a thermal label printer or a plain office laser.\\n\\nKnowing when NOT to use Code 128 matters just as much. If your barcode is going on a product headed for a store shelf and needs to scan at a retail point of sale, you want a fixed retail symbology instead — EAN-13 or UPC-A — because those are what registers and GS1 databases expect. Reach for the sibling EAN-13 barcode generator for those. Code 128 is for everything internal and operational: cartons, totes, work orders, badges, shelf edges, and the countless things that only your own systems need to read. For 14-digit shipping-carton codes specifically, the main Barcode Generator also offers ITF-14.\\n\\nThis page is part of everyboringtool.com's Barcode Generator. It shares the same engine and the same conveniences: per-type validation that rejects a bad value with a message before you print it, single-code download as PNG or vector SVG, and a Bulk mode that turns a pasted list into a whole batch. In bulk you can generate hundreds of Code 128 labels at once, download them as a ZIP of PNGs, or open a printable label sheet you can send straight to a printer or save as PDF — ideal for tagging a shelf of inventory in one pass. If you need crisp print artwork that scales, the SVG barcode generator sibling exports the same Code 128 as a vector. Everything runs locally on your device, so SKUs, order numbers, and asset IDs never leave your browser. Note the tool encodes the value you already have — it doesn't assign or register GS1 company prefixes, and it doesn't make QR codes.",
    "faq": [
      {
        "q": "What is a Code 128 barcode generator?",
        "a": "It's a tool that encodes any text or number into a CODE128 barcode — the dense, alphanumeric symbology used for shipping labels, logistics, asset tags, and internal SKUs. This one runs entirely in your browser and preset the type to CODE128 for you."
      },
      {
        "q": "What can a Code 128 barcode contain?",
        "a": "The full ASCII set: uppercase and lowercase letters, digits, and common symbols like dashes, slashes, and dots. That's why it suits order numbers, asset tags, and location codes rather than digits-only retail products."
      },
      {
        "q": "When should I use Code 128 instead of EAN-13 or UPC-A?",
        "a": "Use Code 128 for anything internal or operational — cartons, bins, work orders, badges, and SKUs your own systems read. Use EAN-13 or UPC-A only for products that scan at a retail checkout; see our sibling EAN-13 barcode generator for those."
      },
      {
        "q": "Do I need to pick a Code 128 subset (A, B, or C)?",
        "a": "No. The generator uses automatic mode, which switches between character sets — including the compact numeric Code Set C — to keep the barcode as short as possible. You just type the value."
      },
      {
        "q": "Can I generate many Code 128 barcodes at once?",
        "a": "Yes. Switch to Bulk mode, paste your values one per line (optionally 'value,caption'), and generate the whole batch. Download a ZIP of PNGs or open a printable label sheet to print or save as PDF, up to 250 at a time."
      },
      {
        "q": "Can I download a Code 128 barcode as a vector?",
        "a": "Yes. In single mode you can download either a PNG or a vector SVG. SVG stays crisp at any print size, which is useful for packaging and signage — the SVG barcode generator sibling page is built around that use case."
      },
      {
        "q": "Why does my value say it's invalid?",
        "a": "Code 128 is forgiving and accepts almost any text, so an error usually means an unsupported character slipped in. Remove it, or check you're not on a stricter type like EAN-13. The tool validates before you print so you catch it early."
      },
      {
        "q": "Does this register a barcode number or make QR codes?",
        "a": "No. It encodes the value you already have into a Code 128 image — it doesn't assign or register GS1 company prefixes (buy those from GS1), and it doesn't create QR codes, which are a separate 2D format with its own tool."
      }
    ],
    "howto": [
      "Leave the type set to CODE128 (the preset here)",
      "Type or paste the text or number you want to encode",
      "Set the size and choose whether to show the human-readable value",
      "Download a scannable PNG or vector SVG — or switch to Bulk mode for a whole list"
    ]
  },
  "barcode-generator/ean-13": {
    "toolSlug": "barcode-generator",
    "flagshipName": "Barcode Generator",
    "flagshipUrl": "/qr-barcode/barcode-generator",
    "flagshipDesc": "The full generator — 8 symbologies, bulk mode, ZIP & SVG export.",
    "clusterLabel": "barcode generators",
    "updated": "2026-09-07",
    "url": "/barcode-generator/ean-13",
    "crumbName": "EAN-13 & UPC",
    "toolProps": {
      "initialFormat": "EAN13"
    },
    "siblings": [
      {
        "name": "Code 128 Generator",
        "url": "/barcode-generator/code-128"
      },
      {
        "name": "Bulk Barcode Generator",
        "url": "/barcode-generator/bulk"
      },
      {
        "name": "SVG / Vector Barcode",
        "url": "/barcode-generator/svg"
      }
    ],
    "h1": "EAN-13 Barcode Generator (Free UPC Barcode Maker)",
    "seoTitle": "EAN-13 Barcode Generator - Free UPC Maker",
    "metaDescription": "Free EAN-13 barcode generator with UPC-A support. Enter your 12-13 digit product number, we compute the check digit, download PNG or vector SVG. No sign-up.",
    "lede": "This EAN-13 barcode generator turns a retail product number into a scannable barcode right in your browser, computing the check digit for you and exporting a clean PNG or vector SVG. It also makes UPC-A codes, so whether you sell in Europe, North America, or globally on Amazon and Shopify, you can encode the number you already own and print it. Nothing uploads, nothing needs an account.",
    "about": "EAN-13 is the barcode you see on almost every packaged retail product outside North America, and its close cousin UPC-A covers the United States and Canada. This page presets our Barcode Generator to the EAN13 symbology so you can paste your 12 or 13 digit product number and get a print-ready barcode instantly. As you type, the live preview redraws and per-type validation checks your value against the EAN-13 rules, rejecting anything that is the wrong length or contains non-digits with a plain message instead of a broken image. Once it looks right you download a crisp PNG for web listings or a vector SVG that stays sharp on packaging at any size, and you can toggle the human-readable digits printed under the bars on or off.\n\nThe detail that trips people up most is the check digit, and the tool handles it for you. An EAN-13 code is really 12 meaningful digits plus a 13th check digit calculated from the first twelve using the standard modulo-10 weighting (alternating 1 and 3 multipliers). If you enter 12 digits, we compute and append the correct check digit; if you enter a full 13-digit number, we validate that the check digit you supplied is actually correct. UPC-A works the same way with 11 or 12 digits. This is why a number that looks fine can still get rejected: the check digit is doing its job of catching a transposed or mistyped digit before it ever reaches a scanner.\n\nOne honest thing worth being clear about: this tool encodes a product number you already have, it does not assign or register one. The company prefix at the start of a real EAN-13 or UPC-A number is issued by GS1, the global standards body, and you buy that from GS1 (or from a legitimate reseller) so that your codes are globally unique and accepted by retailers. We never invent a prefix for you. If you already have your GS1 numbers, or you only need internal codes that will never cross into open retail, you are in exactly the right place. This page is one preset of the same Barcode Generator; for shipping labels, asset tags, and any text-based SKU see the Code 128 page, and to encode a whole spreadsheet of product numbers in one pass see the Bulk page. Note this is a barcode tool, not a QR code maker, which lives separately.",
    "faq": [
      {
        "q": "What is the difference between EAN-13 and UPC-A?",
        "a": "They are the same barcode family with a length difference. EAN-13 carries 13 digits and is the retail standard in Europe and most of the world; UPC-A carries 12 digits and is used in the United States and Canada. A UPC-A number is essentially an EAN-13 with a leading zero, so many scanners read both. This tool generates either one - pick EAN-13 for a 12-13 digit number, or UPC-A for an 11-12 digit US/Canada code."
      },
      {
        "q": "Does this EAN-13 barcode generator calculate the check digit?",
        "a": "Yes. Enter 12 digits and it computes the correct 13th check digit for you using the standard modulo-10 algorithm. Enter a full 13-digit number and it validates that your check digit is correct, rejecting the value if it is not. UPC-A gets the same treatment with 11 or 12 digits. That check digit is what lets a scanner catch a single mistyped digit."
      },
      {
        "q": "Will these barcodes actually scan at a store checkout?",
        "a": "The barcodes are correctly encoded and will scan reliably, as long as the number itself is a real, GS1-issued product number. A scanner reads whatever digits you encode; whether a retailer's system recognizes those digits depends on you owning a legitimate GS1 prefix. For internal inventory or catalog use, any valid EAN-13 or UPC-A number scans fine on your own equipment."
      },
      {
        "q": "Does this register a GS1 company prefix or give me a real UPC?",
        "a": "No, and that is an important distinction. This tool encodes a number you already have into a barcode image; it does not assign, register, or sell you a product number. Globally unique retail numbers come from GS1, which you buy a company prefix from. If you plan to sell through major retailers or Amazon, get your numbers from GS1 first, then bring them here to generate the barcodes."
      },
      {
        "q": "Can I download the EAN-13 barcode as a vector SVG?",
        "a": "Yes. In single mode you can download a PNG for screens and online listings, or a vector SVG that stays perfectly crisp at any size - ideal for product packaging, labels, and print artwork in Illustrator or InDesign. If vector print quality is your main concern, the SVG barcode page on this site goes deeper on why print needs vector over PNG."
      },
      {
        "q": "How do I make barcodes for a whole product list at once?",
        "a": "Use the Bulk page, which is the same generator set to batch mode. Paste your product numbers one per line (optionally as value,caption), generate the whole set, then download a ZIP of PNGs or open a printable label sheet you can send to PDF. It is built for tagging a full catalog or inventory in one pass rather than one code at a time."
      },
      {
        "q": "Is my product data uploaded anywhere?",
        "a": "No. Everything runs client-side in your browser using JsBarcode. Your product numbers are never sent to a server, nothing is stored, and there is no sign-up. When you close the tab, nothing about your codes remains anywhere but on your own machine in whatever files you chose to download."
      },
      {
        "q": "Can this generate QR codes for my products instead?",
        "a": "Not on this page - this is a 1D retail barcode generator for EAN-13 and UPC-A. QR codes are a separate 2D format with their own tool on the site. If you specifically need the linear striped barcode that a retail scanner reads, EAN-13 or UPC-A here is what you want."
      }
    ],
    "howto": [
      "Choose EAN-13 for a European or global retail product, or switch to UPC-A if your number is a 11-12 digit North American UPC.",
      "Type or paste your product number: 12 digits and we add the check digit, or a full 13-digit code and we verify the one you supplied.",
      "Watch the live preview and validation. If the value is the wrong length or has non-digit characters, fix it until the message clears and the bars render.",
      "Set the size (Small, Medium, or Large) and keep the human-readable digits shown under the bars so cashiers and staff can read the number.",
      "Download a PNG for online listings, or a vector SVG for print and packaging that stays crisp at any scale."
    ]
  },
  "barcode-generator/bulk": {
    "toolSlug": "barcode-generator",
    "flagshipName": "Barcode Generator",
    "flagshipUrl": "/qr-barcode/barcode-generator",
    "flagshipDesc": "The full generator — 8 symbologies, bulk mode, ZIP & SVG export.",
    "clusterLabel": "barcode generators",
    "updated": "2026-09-07",
    "url": "/barcode-generator/bulk",
    "crumbName": "Bulk",
    "toolProps": {
      "initialMode": "bulk"
    },
    "siblings": [
      {
        "name": "Code 128 Generator",
        "url": "/barcode-generator/code-128"
      },
      {
        "name": "EAN-13 / UPC Generator",
        "url": "/barcode-generator/ean-13"
      },
      {
        "name": "SVG / Vector Barcode",
        "url": "/barcode-generator/svg"
      }
    ],
    "h1": "Bulk Barcode Generator — Batch From a List",
    "seoTitle": "Bulk Barcode Generator — Batch From a List, Free",
    "metaDescription": "Free bulk barcode generator. Paste a list (value,caption), batch-make hundreds of barcodes at once, and download a ZIP of PNGs or a printable label sheet.",
    "lede": "This bulk barcode generator turns a plain list into a whole batch of barcodes at once — paste your values one per line, click generate, and download the entire set as a ZIP of PNGs or open a printable label sheet. It is built for the moment you have 40 SKUs, 200 asset tags, or a warehouse bin list to encode and do not want to make each barcode by hand. Everything runs in your browser: no sign-up, nothing uploaded, capped at 250 values per run.",
    "about": "The whole point of batch mode is the input box. Instead of typing one value and downloading one image, you paste a list — one barcode per line — and the tool renders every line as its own barcode in a single pass. Each line can be just the value (SKU00123) or, if you add a comma, a value and a caption (SKU00123,Blue Widget 500ml). The part before the comma is what gets encoded into the bars; the part after the comma is the human-readable label the tool prints under that specific barcode, so your printout says \"Blue Widget 500ml\" instead of only the raw number. That one feature is what makes a batch actually usable on a shelf or a bin — a wall of identical-looking codes is far more useful when each carries its own plain-English caption. This is the same engine as the single-barcode tool and the Code 128 page; bulk mode just points it at a list.\n\nBecause the batch shares one symbology, pick the format that matches every value in your list before you generate. CODE128 is the safe default for internal use — it encodes any text or number, so mixed SKUs, location codes, and asset tags all pass. If your list is retail product numbers, choose EAN-13 or UPC-A and every line must be a valid digit string of the right length, because the tool validates each value against the chosen symbology and flags any line it cannot encode rather than silently producing a broken barcode. That per-line validation is the safeguard for a batch: one typo in a 200-line paste gets caught and named instead of shipping to a label printer. The run is capped at 250 values at a time, which keeps the browser responsive and is a sensible print-sheet size; for a larger catalog, split it into a couple of batches. If you only need one barcode as sharp vector art, the SVG page is the better tool — bulk mode outputs raster PNGs.\n\nOnce the batch is generated you have two ways out, and they suit different jobs. Download a ZIP and you get every barcode as a separate PNG file, named so you can drop them into a spreadsheet, a template, or your own label software. Open the label sheet instead and the tool lays the whole batch out on a printable page — captions included — that you send straight to a printer or \"print to PDF\" for a ready-to-cut sheet of tags. Both happen entirely on your device; your list of SKUs never leaves the browser. Two honest limits worth stating up front: this tool encodes numbers you already own, it does not assign or register GS1 company prefixes — if you need genuine retail EAN/UPC numbers, you buy those from GS1 first and paste them here. And it makes linear barcodes only, not QR codes; those live in the separate QR tool. For the barcode types and check-digit details behind a single code, see the Code 128 and EAN-13 pages, which are part of the same Barcode Generator.",
    "faq": [
      {
        "q": "What is a bulk barcode generator?",
        "a": "It is a tool that creates many barcodes at once from a list instead of one at a time. You paste your values one per line, choose a symbology, and it renders the whole batch — then you download every barcode as a ZIP of PNG files or open a printable label sheet. This one runs entirely in your browser, needs no sign-up, and handles up to 250 values per run."
      },
      {
        "q": "How do I generate barcodes from a list or CSV?",
        "a": "Switch to bulk mode and paste one value per line into the box. For a two-column list like a simple CSV, use the value,caption format — put the number or text to encode before the comma and the label to print under it after the comma, for example 100045,Medium T-Shirt. Copy the relevant column out of your spreadsheet, paste it in, and generate the whole batch in one click."
      },
      {
        "q": "How many barcodes can I make at once?",
        "a": "Up to 250 values per batch. That cap keeps your browser responsive while rendering and happens to be a practical size for a single label sheet. If your catalog is larger, split it into multiple runs of 250 — each run downloads as its own ZIP or prints as its own sheet, so a 600-item list becomes three quick batches."
      },
      {
        "q": "Can I add a label or caption under each barcode?",
        "a": "Yes — that is what the comma is for. Any line written as value,caption encodes the part before the comma into the bars and prints the part after it as the human-readable label beneath that specific barcode. So 100045,Medium T-Shirt shows \"Medium T-Shirt\" on the tag while encoding 100045. Lines with no comma just show the encoded value itself."
      },
      {
        "q": "Do I download a ZIP or a printable sheet?",
        "a": "Either — you choose after generating. Download ZIP gives you every barcode as a separate PNG file, ready to drop into a spreadsheet, a design template, or label software. Open the label sheet lays the whole batch out on one printable page with captions, which you send to a printer or save as a PDF (print to PDF) for a sheet you can cut. Both are produced on your device."
      },
      {
        "q": "Which barcode type should I use for a bulk batch?",
        "a": "CODE128 is the safe default for internal inventory, asset tags, and mixed SKUs because it encodes any text or number. Use EAN-13 or UPC-A only if your list is real retail product numbers — every line then has to be a valid digit string of the right length. The whole batch shares one symbology, so pick the format that fits every value before you generate."
      },
      {
        "q": "What happens if one value in my list is invalid?",
        "a": "The tool validates every line against the symbology you chose and flags any value it cannot encode, rather than producing a broken barcode. So if you pick EAN-13 and one line has 11 digits instead of 12–13, or a letter sneaks into a numeric format, that line is called out. It is a real safeguard for a long paste — one typo gets caught instead of printed onto a label."
      },
      {
        "q": "Does this register GS1 barcodes or make QR codes in bulk?",
        "a": "No to both. This tool encodes numbers you already own — it does not assign or register GS1 company prefixes, so genuine retail EAN/UPC numbers must be bought from GS1 first, then pasted here to make the images. It also makes linear barcodes only, not QR codes; those have a separate QR tool. Bulk mode is about turning a list of values you have into printable barcode images fast."
      }
    ],
    "howto": [
      "Switch the Barcode Generator to bulk mode and choose one symbology for the whole batch — CODE128 for mixed SKUs and asset tags, or EAN-13 / UPC-A if your list is retail product numbers.",
      "Paste your list into the box, one value per line; to add labels, write each line as value,caption (for example 100045,Medium T-Shirt) so the caption prints under that barcode.",
      "Click generate — the tool renders every line and validates each value, flagging any line it cannot encode so you can fix typos before printing. Keep each run to 250 values or fewer.",
      "Download the batch as a ZIP of individual PNG files to drop into a spreadsheet or label software, or open the printable label sheet to send straight to a printer.",
      "For a cut-ready page, use the label sheet and choose print to PDF; for a larger catalog, split it into multiple runs of 250 and repeat."
    ]
  },
  "barcode-generator/svg": {
    "toolSlug": "barcode-generator",
    "flagshipName": "Barcode Generator",
    "flagshipUrl": "/qr-barcode/barcode-generator",
    "flagshipDesc": "The full generator — 8 symbologies, bulk mode, ZIP & SVG export.",
    "clusterLabel": "barcode generators",
    "updated": "2026-09-07",
    "url": "/barcode-generator/svg",
    "crumbName": "SVG / Vector",
    "toolProps": {
      "initialFormat": "CODE128"
    },
    "siblings": [
      {
        "name": "Code 128 Generator",
        "url": "/barcode-generator/code-128"
      },
      {
        "name": "EAN-13 / UPC Generator",
        "url": "/barcode-generator/ean-13"
      },
      {
        "name": "Bulk Barcode Generator",
        "url": "/barcode-generator/bulk"
      }
    ],
    "h1": "SVG Barcode Generator — Vector Barcodes for Print",
    "seoTitle": "SVG Barcode Generator | Free Vector Barcodes",
    "metaDescription": "Free SVG barcode generator. Make crisp vector barcodes that stay sharp at any size for Illustrator, InDesign and packaging. Download SVG or PNG, no sign-up.",
    "lede": "This SVG barcode generator makes true vector barcodes that stay razor-sharp at any size — download a scalable SVG (or a PNG) and drop it straight into Illustrator, InDesign, or your packaging artwork without the bars ever going fuzzy. It defaults to Code 128, but every symbology it supports exports the same way: click \"↓ SVG (vector)\" and you get a clean vector file with real path geometry, not a screenshot of bars. Everything runs in your browser — no sign-up, nothing uploaded.",
    "about": "The reason print and design work demand a vector barcode comes down to how a barcode actually stores data: not in the black marks themselves, but in the precise widths of the bars and the spaces between them. A scanner reads the ratio of narrow to wide modules, and the narrowest unit — the X-dimension — has to stay geometrically exact for the decode to succeed. When you scale up a raster PNG, the software interpolates pixels and softens every bar edge; blow it up far enough and the anti-aliased blur can smear one module into the next, shifting the effective bar width and causing misreads or a code that will not scan at all. An SVG has no pixels to blur. The bars are defined as mathematical rectangles, so the barcode is identical at 2 cm on a label and at 2 metres on a warehouse sign — the edges stay hard and the width ratios stay perfect at every scale.\n\nThat is why this page exports SVG rather than only PNG. The tool builds the barcode as a real SVG element with JsBarcode and hands you the serialized vector file, so it opens natively in Adobe Illustrator, InDesign, Affinity, Inkscape, or CorelDRAW as editable geometry. You can resize it freely, place it inside packaging dies or a label template, and — because it is vector — the print RIP renders the bars at the press's own full resolution instead of upscaling a fixed grid of pixels. For anything that goes to a professional printer, a large-format sign, or a die-cut carton, that resolution-independence is the whole point: vector art is device-independent, so the same file is crisp on a 300 dpi label printer and on a wide-format plotter. Keep PNG for quick screen use, email, or dropping into a slide, and reach for SVG whenever the barcode will be printed, scaled, or handed to a designer.\n\nA few honest limits worth stating. This is a vector encoder, not a GS1 registrar — it draws a scannable barcode from a number or text you already have, but it does not assign or register a GS1 company prefix; those you buy from GS1. It also does not make QR codes (that is a separate QR tool on the site), since QR is a 2-D matrix rather than the 1-D linear bars this generator produces. This SVG page is one preset of the same Barcode Generator: if you want the Code 128 symbology explained in depth for shipping and asset labels, see the Code 128 Barcode Generator page, and if you need to turn a whole list of values into files at once, the Bulk Barcode Generator page batches hundreds of them into a ZIP or a printable label sheet.",
    "faq": [
      {
        "q": "What is an SVG barcode generator?",
        "a": "It is a tool that produces a barcode as a vector SVG file — the bars are stored as mathematical shapes rather than a grid of pixels. That makes the barcode infinitely scalable: it stays perfectly crisp whether you print it a centimetre wide on a label or a metre wide on signage. This generator builds the SVG in your browser with JsBarcode and lets you download it with one click; it can also export a PNG if you only need a raster image."
      },
      {
        "q": "Why use a vector SVG barcode instead of a PNG?",
        "a": "Because a barcode encodes data in the exact widths of its bars, and a PNG loses precision when scaled. Enlarging a raster image interpolates pixels and blurs the bar edges, which can distort the narrow-to-wide ratio and cause scan failures. An SVG has no pixels to blur — the bar geometry is exact at every size — so it is the safe choice for print, resizing, and any barcode that will end up larger than the original."
      },
      {
        "q": "Will an SVG barcode open in Illustrator or InDesign?",
        "a": "Yes. The exported SVG opens natively in Adobe Illustrator, InDesign, Affinity Designer, Inkscape, and CorelDRAW as editable vector paths. You can resize it without quality loss, place it inside a packaging die or label template, and the print RIP will render the bars at the printer's full resolution instead of upscaling pixels. That is exactly why vector is the standard hand-off format for barcodes going into professional design and print work."
      },
      {
        "q": "Does scaling an SVG barcode make it unscannable?",
        "a": "No — that is the advantage of vector. Because the bars are defined by geometry rather than pixels, the module widths and quiet zones scale proportionally and stay mathematically exact at any size. A raster barcode risks misreads when enlarged because interpolation softens the edges; a vector barcode keeps hard, precise edges, so it scans reliably whether it is tiny on a jewellery tag or huge on a rack label."
      },
      {
        "q": "Which barcode types can I export as SVG here?",
        "a": "All of them. The generator defaults to Code 128, but the same vector export works for EAN-13, UPC-A, EAN-8, Code 39, ITF-14, MSI, and Codabar. Whatever symbology you pick, the live preview validates your value and the SVG download gives you the same clean, scalable vector output — so a retail EAN-13 or a shipping ITF-14 can go into print artwork just as crisply as a Code 128 asset tag."
      },
      {
        "q": "Does this generate a GS1-registered barcode number?",
        "a": "No. This tool encodes a number or text you already have into a scannable vector barcode — it does not assign or register a GS1 company prefix. If you are putting products into retail and need a globally unique GTIN, you buy the prefix from GS1 and then paste your number here to draw it. The tool computes check digits for retail symbologies like EAN-13 and UPC-A, but it never invents or registers the identifier itself."
      },
      {
        "q": "Can it make a QR code in SVG?",
        "a": "No — this is a linear (1-D) barcode generator, so it makes the striped codes used on products, cartons, and asset tags, not the square QR matrix. For a QR code, use the separate QR tool on the site. If you specifically need a 1-D barcode as crisp vector art for print, this is the right page; for encoding a URL or Wi-Fi into a scannable square, that is a QR job."
      },
      {
        "q": "How do I print a vector barcode at large size for signage?",
        "a": "Generate it here, click \"↓ SVG (vector)\", and hand the SVG to your designer or place it directly in your layout — because it is device-independent vector, it stays sharp at any scale, so large warehouse rack labels and wide-format signs print with clean edges. If you need many at once instead of one big one, the sibling Bulk Barcode Generator can batch a whole list and open a printable label sheet you can send to PDF."
      }
    ],
    "howto": [
      "Choose your symbology (it opens on Code 128) and type or paste the value — the live preview validates it and rejects an invalid number with a message before you export.",
      "Set the size and decide whether to show the human-readable value under the bars; these apply to the vector output too.",
      "Click \"↓ SVG (vector)\" to download a true scalable vector file — or use \"↓ PNG\" if you only need a raster image for screen or email.",
      "Open the SVG in Illustrator, InDesign, Inkscape, or your packaging template; resize it freely and it stays crisp because the bars are geometry, not pixels.",
      "Need many barcodes or a big single one for signage? Switch to the Bulk Barcode Generator to batch a list into a ZIP or a printable label sheet, or scale this SVG up with no loss of sharpness."
    ]
  },
  "compress-video/to-25mb": {
    "toolSlug": "compress-video",
    "flagshipName": "Compress Video",
    "flagshipUrl": "/audio-video/compress-video",
    "flagshipDesc": "The full compressor — target-size and quality modes, all in your browser.",
    "clusterLabel": "video compressors",
    "updated": "2026-09-07",
    "url": "/compress-video/to-25mb",
    "crumbName": "to 25MB",
    "toolProps": {
      "initialMode": "target",
      "initialTargetMb": 25
    },
    "siblings": [
      {
        "name": "For Discord",
        "url": "/compress-video/for-discord"
      },
      {
        "name": "For WhatsApp",
        "url": "/compress-video/for-whatsapp"
      },
      {
        "name": "Without Losing Quality",
        "url": "/compress-video/without-losing-quality"
      }
    ],
    "h1": "Compress Video to 25MB for Email — Free, In Your Browser",
    "seoTitle": "Compress Video to 25MB for Email (Free Online)",
    "metaDescription": "Compress video to 25MB for email free in your browser. Set a 25MB target and this tool hits it — no upload, no sign-up. Works with iPhone .mov and MP4.",
    "lede": "Need to compress a video to 25MB so it slips under the Gmail or Outlook attachment limit? Type 25 (or tap the 25MB preset), drop in your clip, and this tool re-encodes it to land just under that ceiling — right inside your browser, with nothing uploaded to a server.",
    "about": "This is the 25MB email preset of everyboringtool.com's Compress Video tool. What makes it different from a generic \"shrink my video\" button is that you name the number. Most email providers — Gmail, Outlook, Yahoo — cap a single attachment at roughly 25MB, and a raw phone recording blows past that in well under a minute of footage. Here you set 25MB as the target, and the tool reads your video's duration, does the math on the H.264 bitrate that fits inside that budget, and re-encodes to hit it. It deliberately undershoots by about 10% so you stay safely under the hard limit rather than landing at 25.4MB and getting bounced. The result is a standard H.264 MP4 with +faststart, which plays everywhere and starts streaming before it's fully downloaded.\n\nEverything happens locally. The compression runs on ffmpeg.wasm — a single-threaded video encoder compiled to run in your browser tab — so your clip never leaves your device and nothing gets uploaded. The first time you use it, the browser downloads a ~32MB engine; after that it's cached and later runs start faster. Be honest about the trade-off: because all the work is done by your own browser, a long or high-resolution clip is slower here than in a desktop app like HandBrake, and it uses more memory since your machine is doing the encoding. For the short clips people actually email — a screen recording, a few seconds of your kid's recital, a product demo — it's quick and painless. For a 40-minute 4K file, a native app will still be faster.\n\nOne honest caveat on the 25MB target: it's approximate, not a guarantee to the byte. Size targeting depends on the browser being able to read your video's duration, which works reliably for MP4, MOV, and WEBM — the formats phones actually produce. For a container it can't probe (some AVI or MKV files), the tool falls back to a balanced quality encode instead of a precise size hit, so the output may not land exactly at 25MB. If your file is a straight iPhone or Android recording, you're in the well-supported path and the target will be close. If you don't care about an exact number and just want the best-looking small file, see the sibling page below on compressing without losing quality; if you're sizing for a chat app instead of email, the Discord (10MB) and WhatsApp (16MB) presets are tuned to those limits.",
    "faq": [
      {
        "q": "How do I compress a video to 25MB for email?",
        "a": "Open this page, tap the 25MB preset (or type 25 in the target box), then choose your video file. The tool reads its duration, calculates the bitrate that fits under 25MB, and re-encodes it to an MP4. When it finishes, download the file and attach it to your email. It all runs in your browser — nothing is uploaded."
      },
      {
        "q": "Why 25MB specifically?",
        "a": "25MB is the common single-attachment limit for Gmail and Outlook.com, and a widely used ceiling across other email providers too. Targeting 25MB (the tool actually aims a bit under it) gives you the largest file that still attaches cleanly. If your recipient's mail server is stricter, drop the target to 20MB or lower."
      },
      {
        "q": "Will the file be exactly 25MB?",
        "a": "No — it's approximate. The tool computes the bitrate to land just under 25MB and intentionally undershoots by about 10% so it clears the hard limit rather than tripping it. You'll typically get a file in the low-20s of MB. Size targeting is a calculation based on your clip's duration, not a byte-exact promise."
      },
      {
        "q": "Is my video uploaded anywhere?",
        "a": "No. The compression happens entirely inside your browser tab using ffmpeg.wasm. Your file is never sent to a server, so there's no upload wait and nothing to delete afterward. This also means the speed depends on your own device."
      },
      {
        "q": "Does it work with iPhone .mov files?",
        "a": "Yes. iPhone clips (.mov and .mp4) are the best-supported case — the browser can read their duration, so the 25MB target works accurately. It also handles MP4, MOV, WEBM, MKV, and AVI, though for a few containers it can't probe, it falls back to a balanced-quality encode instead of an exact size hit."
      },
      {
        "q": "My video is long — why is it slow?",
        "a": "Because all the encoding runs locally on a single-threaded browser engine, long or high-resolution clips take longer and use more memory than they would in a desktop app. For short email clips it's fast; for very long footage, a native tool like HandBrake will be quicker. Also note the first run downloads a ~32MB engine, which is cached for next time."
      },
      {
        "q": "What format is the output?",
        "a": "A standard H.264 MP4 with +faststart enabled, so it plays on virtually any device and email client and begins playing before it's fully downloaded. No proprietary formats, no watermarks."
      },
      {
        "q": "What if I need it smaller for a chat app instead of email?",
        "a": "This page is tuned to the 25MB email limit. For Discord, use the sibling Compress Video for Discord page (10MB target — safe even on a free account); for WhatsApp, use the Compress Video for WhatsApp page (16MB, matching its video send limit). All three are the same tool with the target preset for you."
      }
    ],
    "howto": [
      "Tap the 25MB preset on this page, or type 25 into the target size box (you can pick 8, 10, 16, 25, or 50 MB).",
      "Select your video file — an iPhone .mov, a screen recording, or any MP4/MOV/WEBM works best for accurate sizing.",
      "Wait while it processes locally in your browser (the first run downloads a ~32MB engine that's cached afterward); longer or higher-resolution clips take more time and memory.",
      "Download the compressed H.264 MP4, which the tool aims just under 25MB so it clears the email limit.",
      "Attach it to your Gmail or Outlook message — if a stricter server still rejects it, re-run with a 20MB or lower target."
    ]
  },
  "compress-video/for-discord": {
    "toolSlug": "compress-video",
    "flagshipName": "Compress Video",
    "flagshipUrl": "/audio-video/compress-video",
    "flagshipDesc": "The full compressor — target-size and quality modes, all in your browser.",
    "clusterLabel": "video compressors",
    "updated": "2026-09-07",
    "url": "/compress-video/for-discord",
    "crumbName": "for Discord",
    "toolProps": {
      "initialMode": "target",
      "initialTargetMb": 10
    },
    "siblings": [
      {
        "name": "Compress to 25MB",
        "url": "/compress-video/to-25mb"
      },
      {
        "name": "For WhatsApp",
        "url": "/compress-video/for-whatsapp"
      },
      {
        "name": "Without Losing Quality",
        "url": "/compress-video/without-losing-quality"
      }
    ],
    "h1": "Compress Video for Discord (Under 10MB, Free & In-Browser)",
    "seoTitle": "Compress Video for Discord Under 10MB - Free",
    "metaDescription": "Compress video for Discord to under 10MB free in your browser. Set a 10MB target and it re-encodes to fit. No upload, no sign-up. Discord limits explained.",
    "lede": "Compress video for Discord to under 10MB, free, right in your browser. Drop in a clip, the tool reads its length, works out the H.264 bitrate that fits your target, and re-encodes it so it drops into any channel or DM without the \"file too large\" wall. Nothing uploads to a server. This is the Discord preset of everyboringtool.com's Compress Video tool, locked to a 10MB target.",
    "about": "This page loads Compress Video with the target size already set to 10MB, the number most people reach for when they want a clip that posts everywhere on Discord without a second thought. Here is the honest breakdown of Discord's real limits, because they changed and a lot of old guides are wrong: a free account can upload files up to 25MB per message. Nitro Basic raises that to 50MB, and full Nitro goes to 500MB. So 10MB is not Discord's ceiling. It is a comfortable safe target: it clears the free 25MB limit with room to spare, uploads fast on slow connections, previews instantly for the people you're sending it to, and won't get throttled or refused if you're posting into a server with its own tighter rules. If your recipients are all on Nitro you can aim higher, but 10MB is the size that just works for everyone.\n\nThe tool runs on single-threaded ffmpeg.wasm compiled to WebAssembly. Your video never leaves your machine, which matters for gaming clips, private DMs, and anything you'd rather not hand to a third-party server. It handles the files you actually have: screen-recorder and clip-capture MP4s, phone .mov and .mp4, plus MOV, WEBM, MKV, and AVI. Output is a clean H.264 MP4 with faststart enabled so it starts playing the instant it loads in Discord's preview. The first run downloads a roughly 32MB engine; after that it's cached and every later compression starts immediately.\n\nBe clear-eyed about two things. First, size targeting is approximate, not exact. The tool computes the bitrate to land your clip under 10MB and deliberately undershoots by about 10% so it stays under the hard limit rather than skimming it and busting. You'll usually get a file a bit below 10MB, which is exactly what you want. Second, in-browser encoding is slower than a desktop app like HandBrake, and a long or high-resolution capture uses real browser memory since all the work happens locally. A 30-second gaming clip is quick. A ten-minute 4K recording will grind and may strain a phone browser, so for very long footage a native app is still the faster road.",
    "faq": [
      {
        "q": "How do I compress a video for Discord under 10MB?",
        "a": "Open this page, drop in your clip, and the tool keeps the 10MB target already set. It reads the video's length, calculates the H.264 bitrate needed to fit, and re-encodes it - undershooting the target by about 10% so it stays comfortably under. Download the MP4 and post it. All of this happens in your browser; nothing uploads."
      },
      {
        "q": "What is Discord's actual file size limit?",
        "a": "A free Discord account can upload files up to 25MB per message. Nitro Basic raises it to 50MB and full Nitro to 500MB. So 10MB isn't the limit - it's a safe, universal target that clears the free 25MB cap with room to spare, uploads fast, and previews instantly for everyone, including people without Nitro."
      },
      {
        "q": "Why target 10MB instead of the full 25MB?",
        "a": "10MB is the number that just works everywhere. It's well under the free 25MB limit, so there's no risk of skimming the edge and getting refused, it uploads quickly on weak connections, and servers with their own stricter rules still accept it. If you know your recipients are all on Nitro, use the 16MB or 25MB preset instead."
      },
      {
        "q": "Is the 10MB target exact?",
        "a": "No - it's approximate. The tool estimates the bitrate to land your clip under 10MB and intentionally aims about 10% below the target so it stays under the hard limit rather than risking going over. You'll typically get a file a little smaller than 10MB, which is what you actually want for a clean Discord upload."
      },
      {
        "q": "Does my gaming clip get uploaded to a server?",
        "a": "No. Compression runs entirely in your browser using ffmpeg.wasm, so your clip never leaves your device. That's ideal for gameplay captures, private DMs, and anything you'd rather not send to a third-party server. The only download is the one-time ~32MB engine, which is then cached."
      },
      {
        "q": "What video formats can I compress for Discord?",
        "a": "MP4, MOV, WEBM, MKV, and AVI - including screen-recorder and clip-capture files and phone .mov/.mp4. Output is always an H.264 MP4 with faststart, so it previews instantly in Discord. Target sizing needs the browser to read the duration, which works for MP4/MOV/WEBM; for containers it can't probe it falls back to a balanced-quality encode."
      },
      {
        "q": "Why is it slower than HandBrake or a desktop app?",
        "a": "Because all the encoding happens locally in your browser tab on a single thread, not on a fast server or with your full CPU. A short gaming clip compresses quickly, but a long or high-resolution recording is slower and uses more browser memory. For very long 4K footage, a native desktop app will still be faster."
      },
      {
        "q": "What if I need a different size for other apps?",
        "a": "This preset targets 10MB for Discord. The same Compress Video tool has sibling presets: 25MB for email attachments (Gmail and Outlook cap around 25MB) at /compress-video/to-25mb, and 16MB for WhatsApp video at /compress-video/for-whatsapp. There's also a quality-first mode at /compress-video/without-losing-quality when file size isn't the constraint."
      }
    ],
    "howto": [
      "Open this page - the Compress Video tool loads with the target size preset to 10MB for Discord.",
      "Drag in your clip (MP4, MOV, WEBM, MKV, or AVI). On the first run it downloads the ~32MB engine, then caches it for next time.",
      "Leave the target at 10MB, or tap a preset like 8MB for extra headroom or 16MB/25MB if your friends are on Nitro. The tool reads the video's duration and sets the bitrate to fit.",
      "Start compressing. Everything runs locally in your browser, so longer or higher-resolution clips take longer and use more memory - a short gameplay clip finishes fast.",
      "Download the H.264 MP4 (it lands a bit under your target) and drop it straight into your Discord channel or DM."
    ]
  },
  "compress-video/for-whatsapp": {
    "toolSlug": "compress-video",
    "flagshipName": "Compress Video",
    "flagshipUrl": "/audio-video/compress-video",
    "flagshipDesc": "The full compressor — target-size and quality modes, all in your browser.",
    "clusterLabel": "video compressors",
    "updated": "2026-09-07",
    "url": "/compress-video/for-whatsapp",
    "crumbName": "for WhatsApp",
    "toolProps": {
      "initialMode": "target",
      "initialTargetMb": 16
    },
    "siblings": [
      {
        "name": "Compress to 25MB",
        "url": "/compress-video/to-25mb"
      },
      {
        "name": "For Discord",
        "url": "/compress-video/for-discord"
      },
      {
        "name": "Without Losing Quality",
        "url": "/compress-video/without-losing-quality"
      }
    ],
    "h1": "Compress Video for WhatsApp",
    "seoTitle": "Compress Video for WhatsApp (Free, In-Browser)",
    "metaDescription": "Compress video for WhatsApp free in your browser. Set a 16MB target and the tool re-encodes your clip to land under WhatsApp's send limit — nothing is uploaded.",
    "lede": "A free, in-browser way to compress video for WhatsApp: this page loads the Compress Video tool with a 16MB target so your clip lands under WhatsApp's video send limit without a single upload.",
    "about": "This page is built to compress video for WhatsApp, and it opens the Compress Video tool with the size target already set to 16MB. That number is not arbitrary: WhatsApp caps a video you send in a chat at roughly 16MB, and clips that go over either fail to attach or get crushed by WhatsApp's own re-compression on the way out. It is the smallest of the common share limits — email tolerates about 25MB and Discord's free tier allows 25MB — so a phone recording that sails through everywhere else is often exactly the file WhatsApp refuses. If you are also posting to Status, keep in mind WhatsApp trims Status videos to about 30 seconds, so a long clip needs trimming elsewhere first; this tool changes file size, not length.\n\nThe 16MB target works by reading your video's duration in the browser, then calculating the H.264 bitrate that fits your footage inside 16MB and re-encoding to hit it. It deliberately aims a little under — about 10% — so the result clears WhatsApp's hard limit instead of grazing it and getting bounced. Because it works from duration and an estimated bitrate, the final size is approximate rather than a precise 16.00MB, but in practice it lands comfortably under the cap. Duration reading works for the phone formats WhatsApp deals in most — MP4 and MOV, plus WEBM — and for a container it cannot probe it falls back to a balanced quality-based encode instead of failing. It takes your iPhone .mov or Android .mp4, MKV, or AVI and hands back a standard H.264 MP4 with +faststart, which is what phones and WhatsApp expect.\n\nEverything runs locally with a single-threaded build of ffmpeg.wasm, so your video never leaves the device — a real plus for the personal clips people actually send over WhatsApp. The honest tradeoff is speed: a browser doing the encoding is slower than a desktop app, and a long or high-resolution recording uses more browser memory and more patience, so trimming to just the part you want to send helps on both counts. The first run downloads a roughly 32MB engine, which is then cached for next time. If you would rather set a slightly larger size for email, the sibling <a href=\"/compress-video/to-25mb\">compress to 25MB</a> page uses the same tool with a 25MB target; and if size is not the constraint and you just want the cleanest possible file, <a href=\"/compress-video/without-losing-quality\">compress without losing quality</a> switches to a quality-first mode instead of a byte target.",
    "faq": [
      {
        "q": "What is WhatsApp's video size limit?",
        "a": "WhatsApp caps a video sent in a chat at roughly 16MB. That is why this page presets the Compress Video tool to a 16MB target — clips over the limit either fail to attach or get heavily re-compressed by WhatsApp itself. Note that Status videos have a separate constraint: they are trimmed to about 30 seconds, so a long clip may need trimming first."
      },
      {
        "q": "Will the file be exactly 16MB?",
        "a": "No — size targeting is approximate. The tool reads your video's duration and calculates the H.264 bitrate needed to fit under 16MB, aiming about 10% under so the result reliably clears WhatsApp's hard limit rather than grazing it. You get a file safely under the cap, not a precise 16.00MB."
      },
      {
        "q": "Does my video get uploaded anywhere?",
        "a": "No. The compression runs entirely in your browser with ffmpeg.wasm, so your video never leaves your device. For the personal clips people send over WhatsApp, that means nothing is transmitted to a server to make this work."
      },
      {
        "q": "Does it work with iPhone .mov files recorded on my phone?",
        "a": "Yes. It handles phone .mov and .mp4 recordings, plus WEBM, MKV, and AVI, and outputs a standard H.264 MP4 with +faststart that WhatsApp and phones expect. Duration reading — which the 16MB target depends on — works for MP4, MOV, and WEBM."
      },
      {
        "q": "Why is it slower than a desktop compressor?",
        "a": "Because it is all local: a single-threaded browser build of ffmpeg.wasm does the encoding on your machine instead of a server farm. Long or high-resolution clips take longer and use more browser memory. Trimming to just the part you want to send makes it faster and lighter."
      },
      {
        "q": "What if the tool can't read my video's duration?",
        "a": "If it can't probe the container's duration, it falls back to a balanced quality-based encode instead of failing. That still shrinks the file meaningfully; it just isn't aimed at the exact 16MB target the way MP4, MOV, and WEBM clips are."
      },
      {
        "q": "Will compressing to 16MB hurt the quality?",
        "a": "H.264 compression is lossy, so squeezing a big clip under 16MB trades some detail for size — usually fine for WhatsApp's playback. If quality matters more than a specific size, use the sibling Compress Video Without Losing Quality page, which uses a quality-first mode instead of a byte target."
      },
      {
        "q": "Why does the first run download about 32MB?",
        "a": "That is the ffmpeg.wasm engine that does the encoding in your browser. It downloads once on the first run and is cached afterward, so subsequent compressions start faster."
      }
    ],
    "howto": [
      "Open this page — the Compress Video tool loads with the size target already set to 16MB for WhatsApp.",
      "Drag in or select your video (iPhone .mov, Android .mp4, or MP4/MOV/WEBM/MKV/AVI). On the first run the browser downloads the ~32MB engine, then caches it.",
      "The tool reads the clip's duration, calculates the H.264 bitrate that fits under 16MB (aiming ~10% under), and re-encodes locally — nothing is uploaded.",
      "Wait for the encode to finish. Long or high-resolution clips take longer and use more browser memory, so trim first if you can.",
      "Download the H.264 MP4 and send it in your WhatsApp chat, or post it to Status (remember Status trims to about 30 seconds)."
    ]
  },
  "compress-video/without-losing-quality": {
    "toolSlug": "compress-video",
    "flagshipName": "Compress Video",
    "flagshipUrl": "/audio-video/compress-video",
    "flagshipDesc": "The full compressor — target-size and quality modes, all in your browser.",
    "clusterLabel": "video compressors",
    "updated": "2026-09-07",
    "url": "/compress-video/without-losing-quality",
    "crumbName": "Without Losing Quality",
    "toolProps": {
      "initialMode": "quality",
      "initialLevel": "high"
    },
    "siblings": [
      {
        "name": "Compress to 25MB",
        "url": "/compress-video/to-25mb"
      },
      {
        "name": "For Discord",
        "url": "/compress-video/for-discord"
      },
      {
        "name": "For WhatsApp",
        "url": "/compress-video/for-whatsapp"
      }
    ],
    "h1": "Compress Video Without Losing Quality",
    "seoTitle": "Compress Video Without Losing Quality (Free)",
    "metaDescription": "Compress video without losing quality in your browser. Quality mode uses CRF 22 (Higher quality) to shrink the file with detail intact. Free, no upload, no sign-up.",
    "lede": "To compress video without losing quality, this page opens the Compress Video tool in Quality mode on the \"Higher quality\" setting (CRF 22) — it re-encodes your clip to shrink the file while keeping detail visually intact, rather than forcing it down to a fixed megabyte number. That is the honest trade: quality-first compression makes the file meaningfully smaller with loss that is hard to spot on normal footage, but \"without losing quality\" means visually lossless, not mathematically perfect. Everything runs in your browser — nothing is uploaded, there is no sign-up, and the output is a standard H.264 MP4 that plays everywhere.",
    "about": "The reason this page exists as its own preset is that \"compress video without losing quality\" is really a request for quality-first compression, and that is a different job from hitting a size limit. The tool has two modes. Target file size mode works backwards from a number — you say 25 MB, it reads the clip's duration, computes the bitrate that lands under that size, and re-encodes to fit; quality is whatever is left over after the size math. Quality mode works the other way around: you fix the quality and let the file size fall wherever it naturally lands. This page loads Quality mode on \"Higher quality,\" which is CRF 22 — the setting that keeps the most detail of the three (Smallest is CRF 30, Balanced is CRF 26). If your goal is preserving how the video looks rather than clearing a hard cap, this is the mode you want, and if you instead need the file under a specific limit, the sibling pages for email (25 MB), Discord (10 MB), and WhatsApp (16 MB) start you in Target mode.\n\nCRF stands for Constant Rate Factor, and it is worth understanding because it is the whole mechanism here. Instead of a fixed bitrate, CRF tells the H.264 encoder to hold a constant visual quality and spend as many bits as each scene needs — a still talking-head shot gets few bits, a fast pan or confetti gets more. Lower CRF means higher quality and a larger file; higher CRF means smaller and softer. CRF 22 sits in the range most people cannot tell apart from the source on everyday footage, which is why it is the \"Higher quality\" preset and why this page defaults to it. Because the encoder allocates bits by difficulty rather than by a size target, quality mode is the setting that comes closest to \"without losing quality\" in practice — you are compressing to a quality floor, not squeezing to a byte count. The catch, stated plainly: all of this is lossy. H.264 re-encoding throws away data your eye is least likely to miss, so a stronger crop or a screenshot of a single frame can reveal it even when the moving video looks identical.\n\nA few honest limits so you know what you are getting. Since quality mode does not target a size, you cannot know the output size in advance — a lightly-compressed original might shrink a lot, while a clip already encoded near its floor may barely change or, rarely, not shrink much at all. If you need both smaller and predictable, run Target mode instead and accept the quality trade. Everything encodes locally with a single-threaded build of ffmpeg, so long or high-resolution clips are slower and use more browser memory than a desktop app like HandBrake would — this shines on the short, everyday phone clips most people are trying to keep crisp, not on a two-hour 4K file. The first run downloads a one-time ~32 MB engine and then caches it, and one rule matters for quality above all: always compress from the original file. Every re-encode is lossy, so compressing an already-compressed export stacks the loss; go back to the source clip and encode once.",
    "faq": [
      {
        "q": "Can you really compress a video without losing any quality?",
        "a": "Not literally — H.264 compression is lossy, so some data is always discarded. What this page delivers is visually lossless compression: on the \"Higher quality\" setting (CRF 22) the encoder keeps enough detail that the result is very hard to tell apart from the source on normal footage, while still making the file smaller. If you need a mathematically perfect copy, you would keep the original; if you want a much smaller file that still looks essentially the same, quality mode at CRF 22 is the closest you can get in the browser."
      },
      {
        "q": "What does CRF 22 mean and why is it the quality setting?",
        "a": "CRF is the Constant Rate Factor — it tells the H.264 encoder to hold a steady visual quality and spend bits scene by scene instead of aiming at a fixed file size. Lower CRF is higher quality and a bigger file. This tool uses CRF 22 for \"Higher quality,\" CRF 26 for \"Balanced,\" and CRF 30 for \"Smallest file.\" CRF 22 sits in the range most viewers can't distinguish from the source on everyday video, which is why it's the quality-first choice this page loads by default."
      },
      {
        "q": "Should I use Quality mode or Target file size mode?",
        "a": "Use Quality mode (this page) when preserving how the video looks matters more than the exact file size — the output lands wherever it naturally falls. Use Target file size mode when you must get under a hard cap: type the megabytes and the tool computes the bitrate to fit, trading some quality for a predictable size. The sibling pages for email (25 MB), Discord (10 MB), and WhatsApp (16 MB) start you in Target mode for exactly those limits."
      },
      {
        "q": "How much smaller will the file be if I keep quality high?",
        "a": "It depends entirely on the source, and quality mode can't tell you in advance because it isn't aiming at a size. A clip that was lightly compressed — like a screen recording or a high-bitrate camera file — can shrink a lot at CRF 22. A video that's already compressed close to its floor may shrink only a little, and occasionally barely at all. If you need the size to be predictable rather than the quality, switch to Target file size mode."
      },
      {
        "q": "Does compressing again lose more quality?",
        "a": "Yes. Every H.264 re-encode is lossy, so compressing a file that was already compressed stacks the loss and softens the picture further. The single most important rule for quality is to always start from the original clip and encode once. If you've already made a compressed copy, go back to the source video and run it through quality mode a single time rather than re-compressing the smaller file."
      },
      {
        "q": "What format does it output, and will it play everywhere?",
        "a": "The output is a standard H.264 MP4 with the +faststart flag, which is about the most universally compatible video format there is — it plays on phones, browsers, editors, and social platforms without conversion. Faststart also lets the file begin playing before it's fully downloaded. Whatever you feed in (phone .mov/.mp4, MP4, MOV, WEBM, MKV, AVI), quality mode re-encodes to that same clean MP4."
      },
      {
        "q": "Is this as good as HandBrake or a desktop compressor?",
        "a": "For quality it uses the same H.264 CRF approach a desktop tool does, so a CRF 22 encode here is comparable in look. The honest difference is speed and scale: this runs a single-threaded build of ffmpeg in your browser, so long or high-resolution clips are slower and use more memory than a native app. It's ideal for short, everyday clips you want to keep crisp without installing anything; for a very long 4K project, a desktop encoder will be faster."
      },
      {
        "q": "Is my video uploaded anywhere?",
        "a": "No. All the encoding happens locally in your browser — your video never leaves your device and no copy is stored on a server. The only download is a one-time ~32 MB processing engine on your first run, which is then cached so later compressions start quickly. There's no account and no sign-up."
      }
    ],
    "howto": [
      "Add your video — the page opens the Compress Video tool already in Quality mode on the \"Higher quality\" (CRF 22) setting, so you don't need to change anything for quality-first compression.",
      "For the best result, load the original clip rather than a file you've already compressed, since every re-encode is lossy and stacking them softens the picture.",
      "Leave the Compression dropdown on \"Higher quality\" to keep the most detail, or drop to \"Balanced\" (CRF 26) if you want a smaller file and can accept slightly more loss.",
      "Click Compress video and let it encode locally — the first run downloads a one-time ~32 MB engine, and long or high-resolution clips take longer because everything runs in your browser.",
      "Download the H.264 MP4. If it isn't small enough for a specific limit, switch to Target file size mode — or use the sibling pages for email (25 MB), Discord (10 MB), or WhatsApp (16 MB)."
    ]
  },
  "invoice-generator/freelance": {
    "toolSlug": "invoice-generator",
    "flagshipName": "Invoice Generator",
    "flagshipUrl": "/local-business/invoice-generator",
    "flagshipDesc": "The full generator — currency, logo, tax label, discount and PDF download.",
    "clusterLabel": "invoice makers",
    "updated": "2026-09-07",
    "url": "/invoice-generator/freelance",
    "crumbName": "for Freelancers",
    "toolProps": {},
    "siblings": [
      {
        "name": "Contractor Invoice",
        "url": "/invoice-generator/contractor"
      },
      {
        "name": "Photography Invoice",
        "url": "/invoice-generator/photography"
      },
      {
        "name": "GST / VAT Invoice",
        "url": "/invoice-generator/gst-vat"
      }
    ],
    "h1": "Free Freelance Invoice Generator",
    "seoTitle": "Freelance Invoice Generator — Free PDF, No Sign-Up",
    "metaDescription": "Free freelance invoice generator: add hourly and fixed line items, set payment terms, and download a clean PDF in your browser. No sign-up, no watermark.",
    "lede": "This free freelance invoice generator turns a few fields into a clean, professional PDF you can send today — built for self-employed people who bill by the hour, by the project, or a mix of both. Type your details, watch the live preview update, and download an A4 invoice. No account, no watermark, nothing uploaded to a server.",
    "about": "Freelancers lose money to slow, sloppy invoicing more than to low rates. A client can only pay you quickly when the invoice tells them exactly what the work was, what it cost, and when payment is due — and when it looks like it came from someone who runs a real business. This tool is built around that: From and Bill-To blocks for your name and the client's, an invoice number and date so you can track what's outstanding, and a due date so \"net 14\" or \"net 30\" isn't left to interpretation. You fill it in, the preview matches the PDF exactly, and you download.\n\nBecause freelance work is rarely one flat number, every line item is its own row with a description, quantity, unit price, and an amount that calculates itself. That means you can bill 12 hours of design at your hourly rate on one line, a fixed logo package on the next, and a rush fee on a third — all on the same invoice. Add a discount percentage if you offered a first-project rate or a loyalty cut, and add a tax line if you charge it; the tax label is editable, so it can read Tax, VAT, GST, or Sales Tax to match where you and your client are. A currency selector covers USD, EUR, GBP, INR, CAD, AUD, JPY and more, and the PDF prints the ISO code (like EUR 1,200.00) so the number is never ambiguous across borders. There's a notes field for your payment terms, bank or transfer details, or a thank-you, and an optional logo upload if you want your mark in the top-left corner.\n\nBe clear-eyed about what this is: a genuinely free PDF invoice maker, not accounting software. It does not process payments, keep a saved client list, chase overdue invoices, or handle e-invoicing — you write the invoice, download it, and send it yourself. Your business details, logo, and currency are saved only on your own device, so the \"New invoice\" button clears the client and line items for your next job while keeping your setup ready to go. If your work is more trade- or site-based, the sibling contractor invoice generator handles separating labor from materials and staged deposits; if you shoot or design, the photography invoice page is set up for sessions, packages, and prints. All three are the same generator, framed for the way you actually bill.",
    "faq": [
      {
        "q": "Is this freelance invoice generator really free?",
        "a": "Yes. It's free to use with no sign-up, no account, and no watermark on the PDF. You fill in the fields, the live preview updates, and you download an A4 invoice. Nothing is uploaded — your details stay in your browser on your own device."
      },
      {
        "q": "Can I bill both hourly and fixed-price work on one invoice?",
        "a": "Yes, and this is exactly what freelancers need. Each line item has its own description, quantity, and unit price, and the amount calculates automatically. Put your billable hours on one line (quantity = hours, unit price = your rate), a fixed project fee on another, and any extras like a rush charge on a third — all on the same invoice."
      },
      {
        "q": "How do I set payment terms like net 14 or net 30?",
        "a": "Set the invoice date and a separate due date, then spell out the terms in the notes field (for example, \"Payment due within 14 days by bank transfer\"). A clear due date and terms line is one of the simplest things you can do to get paid faster."
      },
      {
        "q": "Can I add tax or VAT to a freelance invoice?",
        "a": "Yes. There's a tax line with an editable label, so you can set it to Tax, VAT, GST, or Sales Tax, and enter your rate. You can also apply an optional discount percentage above it — useful for a first-project or loyalty rate. If you need a formal GST or VAT invoice with a tax number, the sibling GST/VAT invoice page covers that setup."
      },
      {
        "q": "Does it save my business details for next time?",
        "a": "Your business details, logo, and currency are stored only on your device, so they persist between invoices. The \"New invoice\" button clears the client and line items for your next job but keeps your own setup, so you're not retyping your name, logo, and currency every time."
      },
      {
        "q": "Can I invoice a client in another currency?",
        "a": "Yes. The currency selector supports USD, EUR, GBP, INR, CAD, AUD, JPY and more. The PDF shows the ISO currency code (like GBP 900.00) so an overseas client is never guessing which dollar or which rupee you mean."
      },
      {
        "q": "Is this accounting software that tracks who's paid?",
        "a": "No — and it's honest about that. It's a free PDF invoice maker. It doesn't process payments, keep a saved client list, send reminders, or do e-invoicing. You create the invoice, download the PDF, and send it yourself. It's best for freelancers who want a fast, clean invoice without signing up for a subscription tool."
      },
      {
        "q": "Can I put my logo on the invoice?",
        "a": "Yes. You can upload a PNG or JPG logo and it's embedded in the top-left of the PDF. It's optional, but a logo makes a solo freelancer's invoice look established, which quietly helps at payment time."
      }
    ],
    "howto": [
      "Fill in the From block with your name or business, and the Bill-To block with your client's details. Add an invoice number, the date, and a due date that matches your payment terms.",
      "Add a line item for each piece of work. For hourly work, set the quantity to your hours and the unit price to your rate; for fixed work, use a quantity of 1 and put the project fee as the unit price. The amount calculates itself and rolls into the subtotal.",
      "Apply an optional discount percentage if you offered a reduced rate, and add a tax line if you charge it — rename the tax label to Tax, VAT, GST, or Sales Tax as needed and pick your currency.",
      "Use the notes field for your payment terms and how to pay you (bank transfer, etc.), and optionally upload your logo. Check the live preview, then download the A4 PDF and send it to your client."
    ]
  },
  "invoice-generator/contractor": {
    "toolSlug": "invoice-generator",
    "flagshipName": "Invoice Generator",
    "flagshipUrl": "/local-business/invoice-generator",
    "flagshipDesc": "The full generator — currency, logo, tax label, discount and PDF download.",
    "clusterLabel": "invoice makers",
    "updated": "2026-09-07",
    "url": "/invoice-generator/contractor",
    "crumbName": "for Contractors",
    "toolProps": {},
    "siblings": [
      {
        "name": "Freelance Invoice",
        "url": "/invoice-generator/freelance"
      },
      {
        "name": "Photography Invoice",
        "url": "/invoice-generator/photography"
      },
      {
        "name": "GST / VAT Invoice",
        "url": "/invoice-generator/gst-vat"
      }
    ],
    "h1": "Contractor & Construction Invoice Generator",
    "seoTitle": "Contractor Invoice Generator — Free, No Sign-Up",
    "metaDescription": "Free contractor invoice generator for trades and construction. Split labor and materials, add sales tax, subtract a deposit, and download a clean PDF — no sign-up.",
    "lede": "This contractor invoice generator turns a day of labor, a pile of material receipts, and a deposit already collected into one clean, itemized PDF you can hand a client on site — built for trades and construction, not for spreadsheets. List every hour and every material as its own line, add your sales tax with a real \"Sales Tax\" label, subtract the deposit, and download an A4 invoice that matches the live preview exactly. It runs entirely in your browser: no sign-up, no watermark, nothing uploaded, and your business name, logo, and currency are saved on your device so the next job's invoice starts half-done.",
    "about": "The thing that makes a construction invoice different from a freelancer's is that it has two kinds of cost on it — your labor and the materials you fronted — and clients want to see them apart. This generator gives you unlimited line items, so the honest way to build a contractor invoice is one line per thing: \"Framing labor, 16 hrs @ $65\", \"2x4 lumber (Home Depot receipt)\", \"Demolition and haul-away\", \"Electrical rough-in\". Quantity times unit price fills the amount column for you, and the subtotal adds it all up. Keeping labor and materials on separate lines isn't just tidy — in many US states materials are taxable while labor isn't, and a client disputing a bill will always challenge a vague \"$4,200 for the job\" far faster than a list that shows exactly where the money went. Change orders get the same treatment: add a line, describe the extra scope, price it, and the total updates. If you mark up materials, price the line at your marked-up rate rather than the receipt total — the invoice shows what the client owes, and your cost stays your business.\n\nDeposits, progress draws, and retainage are where you should know the honest limits up front, because this is a PDF maker, not job-costing software — there is no dedicated deposit or retainage field. What works cleanly: bill each stage of the job as its own invoice (deposit invoice, progress invoice for the framing draw, final invoice), numbering them INV-001, INV-002 and so on. To show a deposit you already collected on the final bill, add a line item like \"Deposit received (paid 3/14)\" and enter a negative unit price such as -1500 — the amount column goes negative and the total drops by that much, so the client sees exactly what's left owing. Retainage that a general contractor withholds until closeout works the same way: a \"Retention held (10%)\" line with a negative amount, or simply a note in the Notes field spelling out the retained figure and when it's due. The percentage Discount field is really meant for an actual discount (a repeat-customer or early-pay break), so reach for a negative line item when the amount is a fixed dollar figure rather than a percentage.\n\nSales tax rides on the tool's editable tax label: type \"Sales Tax\" (or leave it as \"Tax\"), enter your combined state-and-local rate, and it's applied to the taxable subtotal after any discount. One thing to be straight about — the tax line applies a single rate to the whole subtotal, so if your jurisdiction taxes materials but not labor, this tool won't split that automatically; the practical workaround is to invoice taxable materials separately, or calculate the material-only tax yourself and drop it in as a line. Beyond tax, you can upload your company logo (it embeds top-left of the PDF), pick your currency, and put your license number, insurance, or bond details right in the From address block — there's no separate field for them, but the address box takes as many lines as you need. It is not accounting software: it won't save a client list, take card payments, or file anything for you. For the self-employed side of the trades, the Freelance Invoice page is a lighter fit, and if you invoice under GST or VAT, the GST/VAT Invoice page presets the tax label and currency for you — all three are the same Invoice Generator, framed for a different job. The \"New invoice\" button clears the client and line items but keeps your business details, logo, and currency, so the second invoice of the day takes seconds.",
    "faq": [
      {
        "q": "What is a contractor invoice generator?",
        "a": "It is a free tool that builds an itemized invoice for trades and construction work and downloads it as a PDF. This one lets you list labor and materials as separate line items, add a sales tax line, subtract a deposit, upload your logo, and hand the client a clean A4 invoice. It runs entirely in your browser with no sign-up and nothing uploaded — it makes the document, it is not accounting or job-costing software."
      },
      {
        "q": "How do I separate labor and materials on a construction invoice?",
        "a": "Give each its own line item. Add a line for labor (for example \"Tile install, 12 hrs @ $70\") and separate lines for materials (\"Porcelain tile, 220 sq ft\", \"Thinset and grout\"). Quantity times unit price fills the amount automatically and the subtotal totals everything. Splitting them out matters because clients scrutinize a lump sum, and because in many states materials are taxable while labor is not — a clear breakdown makes both the bill and the tax defensible."
      },
      {
        "q": "How do I show a deposit or a progress payment that's already been paid?",
        "a": "There is no dedicated deposit field, so the honest way is a line item: add \"Deposit received (paid 3/14)\" and enter a negative unit price like -2000. The amount column goes negative and the total drops by that much, showing the client exactly what's still owing. For staged work, an alternative is to bill each phase as its own numbered invoice — a deposit invoice, a progress invoice, then a final invoice — so each draw stands on its own."
      },
      {
        "q": "Can I handle retainage or retention on the invoice?",
        "a": "Yes, manually — there's no built-in retainage field, so add a line item such as \"Retention held (10%)\" with a negative amount, or spell the retained figure out in the Notes at the bottom along with when it becomes due at closeout. The tool won't calculate the retention percentage for you the way project-management software would, but it will show the withheld amount clearly on the PDF so the final balance is unambiguous."
      },
      {
        "q": "How do I add sales tax to a contractor invoice?",
        "a": "Set the editable tax label to \"Sales Tax\" and enter your combined state-and-local rate; it's applied to the subtotal after any discount, and the total updates live. Be aware the tool applies one rate to the whole taxable subtotal, so if your jurisdiction taxes materials but not labor, it won't split that on its own. The workaround is to invoice taxable materials separately, or work out the material-only tax and enter it as a line."
      },
      {
        "q": "Can I put my company logo and license or insurance number on it?",
        "a": "Yes. Upload a PNG or JPG logo and it embeds in the top-left of the PDF. There's no separate field for a license, bond, or insurance number, but the From (your business) address block accepts as many lines as you want — put your license #, EIN, and insurance carrier right there and they'll print under your business name on every invoice. Your logo and business details are saved on your device, so they carry over to the next job automatically."
      },
      {
        "q": "Does it save my clients or take payments like QuickBooks?",
        "a": "No, and it's worth being clear: this is a free PDF invoice maker, not accounting software. It won't keep a saved client list, process credit-card or ACH payments, sync to your books, or file taxes. What it does do well is produce a professional, itemized invoice in seconds with no account and no monthly fee. Many trades use it for exactly that and record payment separately in whatever system they already keep."
      },
      {
        "q": "Can I reuse it for my next job without retyping everything?",
        "a": "Yes. The \"New invoice\" button clears the client and the line items but keeps your business name, address, logo, and currency, and it bumps the invoice number for you (INV-001 to INV-002). So your setup is entered once and every future invoice starts pre-filled with your details — you just add the new client and this job's labor and materials."
      }
    ],
    "howto": [
      "Fill in the From block with your business name, address, and license or insurance details, and upload your logo — these save to your device and carry over to every future invoice.",
      "Add the client in the Bill To block, set the invoice number, date, and due date, and pick your currency (USD by default).",
      "Add one line item per piece of work: labor lines as hours times your rate, and each material or change order on its own line so the client can see the breakdown.",
      "Set the tax label to \"Sales Tax\", enter your rate, and if a deposit was already paid, add a line item with a negative unit price to subtract it from the total.",
      "Check the live preview, add any payment terms or retainage note in Notes, then download the A4 PDF — it matches the preview exactly, with no watermark or sign-up."
    ]
  },
  "invoice-generator/photography": {
    "toolSlug": "invoice-generator",
    "flagshipName": "Invoice Generator",
    "flagshipUrl": "/local-business/invoice-generator",
    "flagshipDesc": "The full generator — currency, logo, tax label, discount and PDF download.",
    "clusterLabel": "invoice makers",
    "updated": "2026-09-07",
    "url": "/invoice-generator/photography",
    "crumbName": "for Photography",
    "toolProps": {},
    "siblings": [
      {
        "name": "Freelance Invoice",
        "url": "/invoice-generator/freelance"
      },
      {
        "name": "Contractor Invoice",
        "url": "/invoice-generator/contractor"
      },
      {
        "name": "GST / VAT Invoice",
        "url": "/invoice-generator/gst-vat"
      }
    ],
    "h1": "Photography Invoice Generator",
    "seoTitle": "Photography Invoice Generator — Free PDF, No Sign-Up",
    "metaDescription": "Free photography invoice generator with your studio logo. Bill session fees, packages and prints as line items, show a deposit paid, and download a clean PDF.",
    "lede": "This photography invoice generator makes a clean, branded invoice for a shoot in your browser and downloads it as a real PDF — no sign-up, no watermark, nothing uploaded. Upload your studio logo once, add a line for the session fee, the package, and any prints or albums, and the subtotal and total update live as you type. It is built for photographers and creative studios who want an invoice that looks like their brand without opening accounting software or paying for a template. This page is one preset of the same Invoice Generator; the freelance and contractor versions frame the same tool for those jobs.",
    "about": "A photography invoice has to do more than name a price — it has to itemize a shoot in a way the client recognizes from your quote. The generator gives you unlimited line items with a description, quantity, unit price, and an auto-calculated amount, which maps neatly onto how session work is actually billed: one line for the session or coverage fee, one for the package or collection, and separate lines for add-ons like extra hours, a second shooter, prints, albums, or digital delivery. Quantity does the work for you — 25 prints at 4.00 each, or 3 hours of extra coverage at your hourly rate — and the subtotal rolls everything up. Because each line is free text, you can be as specific as \"8-hour wedding coverage\" or \"Newborn mini session — 45 min, 15 edited images,\" which is exactly the detail that stops a client from querying the bill later.\n\nBranding is where this tool earns its place for creatives, so the logo upload is front and center. Add a PNG or JPG of your studio mark and it embeds top-left of the PDF, so the invoice looks like it came from your business rather than a spreadsheet. Your logo, business details, and currency are saved on your device, and the \"New invoice\" button clears only the client and the line items — keeping your branding loaded for the next shoot, so the second invoice takes seconds. The currency selector matters more in photography than most trades: destination weddings, elopements, and remote clients mean you may bill in EUR, GBP, CAD, AUD, or another currency, and the PDF prints the ISO code (like \"GBP 1,800.00\") so the amount is unambiguous no matter where the client's bank sits.\n\nThe honest part: this is a free PDF invoice maker, not studio-management or accounting software. It does not process payments, store a client list, or track what has been paid, so a deposit or retainer that a client already paid has to be handled by hand — and there are two clean ways to do it. If your deposit is a round share of the total you can apply the discount percentage to knock it off, but the more reliable method for a fixed sum is to note it plainly: list the full package on the line items, then use the notes field for \"USD 500 deposit received on 12 March — balance USD 1,300 due on delivery,\" and put delivery and usage terms there too. That keeps the math correct and the expectation explicit. For separating labor from materials on a build, or billing hourly freelance work, see the sibling contractor and freelance invoice pages — same tool, different framing.",
    "faq": [
      {
        "q": "How do I make a photography invoice for free?",
        "a": "Fill in your studio details in the From block and the client in Bill To, add a line item for the session fee and any packages, prints, or add-ons, set your currency and tax if it applies, then download the PDF. It runs entirely in your browser with no sign-up and no watermark, and the downloaded A4 PDF matches the live preview exactly."
      },
      {
        "q": "Can I put my studio logo on the invoice?",
        "a": "Yes — that is the main reason photographers use this page. Upload a PNG or JPG and it embeds in the top-left of the PDF so the invoice carries your brand. Your logo is stored only on your device and stays loaded when you hit New invoice, so every future invoice starts with your branding already in place."
      },
      {
        "q": "How do I show a deposit or retainer the client already paid?",
        "a": "Because this is a PDF maker and not accounting software, you record it manually. The cleanest way for a fixed deposit is to list the full package as normal and add a note like 'USD 500 deposit received on 3 May — balance USD 1,300 due,' so the client sees exactly what is outstanding. If your deposit happens to be a clean share of the total, you can instead apply the discount percentage to reduce the amount due."
      },
      {
        "q": "How do I itemize a shoot with a package plus prints?",
        "a": "Use a separate line item for each part of the job. Put the session or coverage fee on one line, the package or collection on another, and prints, albums, or extra hours on their own lines — the quantity field handles things like 25 prints at one unit price, and each amount is calculated for you. The subtotal adds everything up so the client sees a clear, itemized total rather than one lump sum."
      },
      {
        "q": "Can I invoice an international client in another currency?",
        "a": "Yes. The currency selector supports USD, EUR, GBP, INR, CAD, AUD, JPY and more, which is useful for destination weddings and remote clients. The PDF prints the ISO currency code — for example 'EUR 1,800.00' — so the amount reads clearly for the client's bank and there is no confusion over which country's dollars or pounds you mean."
      },
      {
        "q": "How do I add sales tax or VAT to a photography invoice?",
        "a": "Turn on the tax line and enter your rate; the tax label is editable, so you can set it to Sales Tax, VAT, GST, or whatever applies where you shoot. The tax is calculated on the subtotal after any discount and shown as its own line before the total. If you need a formal GST or VAT invoice with your tax number, the sibling GST/VAT invoice page covers how to handle that."
      },
      {
        "q": "Where do I put delivery terms and usage rights?",
        "a": "The notes field at the bottom is the place for delivery timelines, print-release or licensing terms, and payment instructions — for example 'Gallery delivered within 3 weeks of the shoot; print release included; balance due before final files are sent.' Notes print on the PDF beneath the totals, which is where clients expect to find the terms that go with the number."
      },
      {
        "q": "Is there a sign-up, watermark, or anything uploaded?",
        "a": "No. There is no account to create, the PDF carries no watermark or branding of ours, and nothing you type — including your logo — is uploaded anywhere. Everything happens in your browser and your business details, logo, and currency are saved only on your own device, so the invoice is entirely yours."
      }
    ],
    "howto": [
      "Enter your studio name and details in the From block and the client in Bill To, then upload your logo (PNG or JPG) so it prints top-left on the PDF.",
      "Add a line item for the session or coverage fee, then separate lines for the package, prints, albums, or extra hours — the quantity times unit price gives each amount and the subtotal adds them up.",
      "Pick your currency (USD, EUR, GBP and more), and if you charge tax, turn on the tax line and set the editable label to Sales Tax, VAT, or GST with your rate.",
      "Record any deposit already paid — apply the discount for a clean percentage, or note the fixed amount and balance due in the notes field along with your delivery and usage terms.",
      "Check the live preview, then download the print-ready A4 PDF; use New invoice next time to keep your logo and branding and just swap in the new client and shoot."
    ]
  },
  "invoice-generator/gst-vat": {
    "toolSlug": "invoice-generator",
    "flagshipName": "Invoice Generator",
    "flagshipUrl": "/local-business/invoice-generator",
    "flagshipDesc": "The full generator — currency, logo, tax label, discount and PDF download.",
    "clusterLabel": "invoice makers",
    "updated": "2026-09-07",
    "url": "/invoice-generator/gst-vat",
    "crumbName": "GST & VAT",
    "toolProps": {
      "initialTaxLabel": "GST",
      "initialCurrency": "INR"
    },
    "siblings": [
      {
        "name": "Freelance Invoice",
        "url": "/invoice-generator/freelance"
      },
      {
        "name": "Contractor Invoice",
        "url": "/invoice-generator/contractor"
      },
      {
        "name": "Photography Invoice",
        "url": "/invoice-generator/photography"
      }
    ],
    "h1": "GST & VAT Invoice Generator (Free, No Sign-Up)",
    "seoTitle": "GST & VAT Invoice Generator — Free PDF Maker",
    "metaDescription": "Free GST and VAT invoice generator. Preset to a GST tax label and INR currency, switch to VAT and any currency, add your GSTIN or VAT number, and download a clean PDF.",
    "lede": "This GST and VAT invoice generator makes a clean, tax-labelled invoice PDF right in your browser — it opens preset to a GST tax label and Indian Rupee (INR) currency, but the tax label is fully editable, so one click changes it to VAT, Sales Tax, or GST and the currency selector switches to GBP, EUR, or any of the supported currencies. You enter your GSTIN or VAT number in the From block, set your tax rate, add line items, and download an A4 PDF that matches the live preview. No sign-up, no watermark, nothing uploaded — and, honestly, it is a PDF maker, not an e-invoicing or IRN system.",
    "about": "The reason this page presets a GST label and INR currency is that those are the two settings a GST or VAT invoice most needs and that a generic invoice maker gets wrong. The tax line here has an editable label, so the row reads GST @ 18% or VAT @ 20% instead of a vague Tax, and the currency selector controls how the PDF prints amounts. It deliberately shows the three-letter ISO code — INR 1,200.00 rather than a rupee symbol — so the figure renders reliably in the PDF font and is never ambiguous on a cross-border invoice where a bare $ or a symbol that fails to embed could mean the wrong currency. Switching to a UK or EU VAT invoice is two changes: retype the tax label to VAT and pick GBP or EUR. Everything else — from/bill-to blocks, invoice number, date and due date, line items, subtotal, an optional discount, notes, and an optional logo — behaves the same as on the main Invoice Generator this page is part of.\\n\\nThe honest mechanics of making the invoice look compliant come down to typing the right things in the right places, because this tool is a document maker, not tax software. Your GSTIN (in India) or your VAT registration number (in the UK or EU) goes into the From address block, and your customer's GSTIN or VAT number goes into the Bill-To block — the tool does not look these up or validate them, so you paste your real registered number exactly as issued. For an itemised GST invoice you put the HSN or SAC code alongside each item in that line's description field, since there is no separate HSN column; the same goes for a VAT invoice description of goods or services. The tax line applies one rate to the taxable value after any discount, which covers a single-rate VAT invoice cleanly and covers an IGST (inter-state) Indian invoice at, say, 18% in one line. What it does not do is split one tax into two rows automatically.\\n\\nThat CGST/SGST split is the most important honest limit to understand for Indian intra-state supply. A local GST invoice legally shows CGST and SGST as two separate lines — for an 18% supply that is 9% CGST plus 9% SGST — and this tool has a single tax line, so it cannot print both rows on its own. The practical workarounds: set the label to GST and the rate to the combined 18% to get the correct total and a clear tax figure, and note the 9% + 9% split in the Notes field; or, if you must show the two components visibly, add them as their own line items. For inter-state supply, a single IGST line is already correct, so the one-tax-line design fits it exactly. The output is a professional, tax-labelled PDF that reads as a proper GST or VAT invoice — but it is not an e-invoice, it does not generate an IRN or QR code, and it does not file anything with the GST portal or HMRC. If you need those, this makes the document; your accounting or e-invoicing system does the filing. Freelancers and consultants raising registered invoices may also want the freelance invoice page, and trades billing labour plus materials with tax can use the contractor invoice page — both are the same generator framed for that work.",
    "faq": [
      {
        "q": "What is a GST and VAT invoice generator?",
        "a": "It is a free tool that builds an invoice PDF with a proper tax line — labelled GST, VAT, GST, or Sales Tax — and the right currency. This one opens preset to a GST label and INR currency for Indian invoices, and you switch the label to VAT and the currency to GBP or EUR for a UK or EU invoice. It runs entirely in your browser, needs no sign-up, and adds no watermark. It makes the document; it is not e-invoicing or accounting software."
      },
      {
        "q": "How do I add my GSTIN or VAT number to the invoice?",
        "a": "Type it into the address blocks. Your own GSTIN or VAT registration number goes in the From block with your business name and address, and your customer's number goes in the Bill-To block. The tool does not look up or verify these numbers, so paste your real registered number exactly as it was issued. That is what makes the PDF read as a compliant tax invoice — the correct numbers shown in the correct places."
      },
      {
        "q": "Can it show CGST and SGST separately for an Indian invoice?",
        "a": "Not automatically — this is the honest limit. The tool has a single tax line, so for intra-state supply it cannot print CGST and SGST as two rows on its own. Two workarounds: set the GST label and use the combined rate (for example 18%) to get the correct total, and note the 9% + 9% split in the Notes field; or add CGST and SGST as separate line items if you need them shown line by line. For inter-state (IGST) supply, one 18% tax line is already correct."
      },
      {
        "q": "How do I make a VAT invoice for the UK or EU?",
        "a": "Change the tax label from GST to VAT and switch the currency to GBP or EUR. Set the rate to your applicable VAT rate — 20% is the UK standard rate — enter your VAT registration number in the From block, and describe each item in its line. The single tax line handles a standard VAT invoice cleanly. The PDF prints amounts with the ISO code (GBP 240.00), so the currency is never ambiguous on a cross-border invoice."
      },
      {
        "q": "Where do I put the HSN or SAC code?",
        "a": "In each line item's description field. There is no separate HSN/SAC column, so you write the code next to the item — for example 'Consulting services (SAC 998311)' — on that line. It prints on the invoice as part of the item description. This keeps an itemised GST invoice readable even though the tool does not have a dedicated code column."
      },
      {
        "q": "Is this a legal e-invoice with an IRN?",
        "a": "No, and it is important to be clear about that. This tool produces a professional, tax-labelled invoice PDF. It does not generate an Invoice Reference Number (IRN) or the e-invoice QR code from the GST portal, it does not connect to the Invoice Registration Portal or HMRC, and it does not file anything. If your turnover requires e-invoicing, generate the document here for your records or client, but use your registered e-invoicing system for the IRN and compliance filing."
      },
      {
        "q": "Why does the PDF show 'INR' instead of the ₹ symbol?",
        "a": "On purpose, for reliability. The PDF prints the three-letter ISO currency code — INR 1,200.00, GBP 240.00, EUR 500.00 — so the amount always renders in the embedded font and is never mistaken for another currency. A bare symbol can fail to embed or be ambiguous across regions, whereas the ISO code is unmistakable on an invoice that may cross borders. The currency selector supports INR, GBP, EUR, USD, and more."
      },
      {
        "q": "Does it save my business details and GSTIN between invoices?",
        "a": "Yes, on your device only. The 'New invoice' button clears the client and line items but keeps your saved business details, logo, and currency, so your GSTIN or VAT number and letterhead carry over to the next invoice without retyping. This is stored locally in your browser — nothing is uploaded to a server, and there is no saved client list or online account."
      }
    ],
    "howto": [
      "Start with the presets: the page opens with the tax label set to GST and the currency to INR. For a UK or EU invoice, change the label to VAT and pick GBP or EUR from the currency selector.",
      "Fill the From block with your business name, address, and your GSTIN or VAT registration number, then the Bill-To block with your customer's details and their GST/VAT number. Add your logo if you want it on the PDF.",
      "Add each line item with its description — include the HSN or SAC code in the description text — plus quantity and unit price; the amount calculates automatically and feeds the subtotal.",
      "Set the tax rate on the single tax line (for example 18% GST or 20% VAT). For an intra-state Indian invoice needing CGST and SGST shown separately, use the combined rate and note the split in Notes, or add the two components as line items.",
      "Check the live preview, add any payment terms or the tax split in Notes, and download the A4 PDF — it matches the preview exactly, with no watermark and no sign-up."
    ]
  },
  "gpa-calculator/what-gpa-do-i-need": {
    "toolSlug": "gpa-calculator",
    "flagshipName": "GPA Calculator",
    "flagshipUrl": "/education/gpa-calculator",
    "flagshipDesc": "The full calculator — weighted, cumulative and the target planner.",
    "clusterLabel": "GPA calculators",
    "updated": "2026-09-07",
    "url": "/gpa-calculator/what-gpa-do-i-need",
    "crumbName": "What GPA Do I Need",
    "toolProps": {
      "initialMode": "target"
    },
    "siblings": [
      {
        "name": "Weighted GPA",
        "url": "/gpa-calculator/weighted"
      },
      {
        "name": "Cumulative GPA",
        "url": "/gpa-calculator/cumulative"
      },
      {
        "name": "College GPA",
        "url": "/gpa-calculator/college"
      }
    ],
    "h1": "What GPA Do I Need to Reach My Goal?",
    "seoTitle": "What GPA Do I Need? Target GPA Calculator",
    "metaDescription": "What GPA do I need to hit my goal? This free target GPA calculator shows the exact average you must earn over your remaining credits, with an honest feasibility check.",
    "lede": "If you have ever stared at your transcript wondering \"what GPA do I need this semester to actually reach my goal?\", this is the page for you. This target GPA calculator runs the math backward: instead of averaging grades you already have, it tells you the exact GPA you need to average over your remaining credits to land on the cumulative GPA you are aiming for — and it is honest when that target is out of reach.",
    "about": "Most GPA tools only look backward. You type in the grades you already earned and they hand you a number. But the question students actually ask before finals is the reverse one: \"what GPA do I need from here to get where I want to be?\" This page presets our GPA Calculator to its \"What GPA do I need?\" mode so it answers exactly that. You enter four things — your current cumulative GPA, the credits you have already completed, your goal cumulative GPA, and the credits remaining — and it returns the single average GPA you would have to earn across those remaining credits to hit your target. Everything runs in your browser, with no sign-up and nothing uploaded.\n\nThe most useful part is the honesty. Because a cumulative GPA is a credit-weighted average, the more credits you have already banked, the less each new semester can move the needle. So the calculator does not just spit out a number and walk away — it flags when the required average lands above a perfect 4.0 (telling you plainly that it is \"not possible on a 4.0 scale\"), and it tells you when your goal is already achieved so you can stop stressing. That feasibility note is the whole point of planning a semester in advance: it is better to learn in week one that a 3.8 goal now needs a 4.2 average than to find out after grades post. If the target is impossible for one term, you can rerun the numbers over two or three semesters of remaining credits to see a realistic path.\n\nA quick honesty caveat that applies to every calculation here: this tool uses the standard US 4.0 letter scale (A = 4.0 down to F = 0.0) and treats your inputs at face value. It does not model plus/minus variations that differ school to school, percentage-based grading, or non-US systems, and it cannot see your registrar's exact rounding or academic-standing rules. Treat the result as a solid estimate and a planning target, not an official promise — confirm the fine print with your advisor. This target planner is one mode of the same GPA Calculator; if you first need your current number, the cumulative GPA calculator combines a prior GPA with a new term, and the weighted GPA calculator handles AP, IB, and Honors bonuses.",
    "faq": [
      {
        "q": "What GPA do I need to reach my goal GPA?",
        "a": "Enter your current cumulative GPA, the credits you have completed, your goal cumulative GPA, and your remaining credits. The calculator returns the exact average GPA you must earn over those remaining credits to hit your target. Because GPA is credit-weighted, that required average is usually higher than the goal itself when you still have credits left to earn."
      },
      {
        "q": "What GPA do I need to raise my GPA from a 3.0 to a 3.5?",
        "a": "It depends entirely on how many credits you have already completed versus how many remain. With few credits banked, a 3.5 is very reachable; with 90 credits already at a 3.0 and only 30 left, the required average may exceed 4.0 and be impossible on the standard scale. Plug in your real numbers and the tool tells you the exact average needed and whether it is feasible."
      },
      {
        "q": "Why does the calculator say my target is not possible on a 4.0 scale?",
        "a": "Because the required average came out above 4.0, which is the maximum on the standard US letter scale (unless you are earning weighted bonuses). This happens when your goal is ambitious relative to how many credits you have left to influence. The honest fix is to lower the goal, or spread the target across more remaining credits — try adding another semester's credits and rerun it."
      },
      {
        "q": "How does it know if my goal is already achieved?",
        "a": "If your current cumulative GPA already meets or exceeds the goal you entered, the calculator says so directly instead of returning a needed average. That is your cue you can aim higher or simply maintain your current pace over the remaining credits."
      },
      {
        "q": "Is this the same as a regular GPA calculator?",
        "a": "It is the same GPA Calculator, just preset to its reverse 'What GPA do I need?' mode. The other mode adds up courses you have taken to compute a GPA. This mode works backward from a goal. You can switch between them anytime within the tool."
      },
      {
        "q": "Does this use a 4.0 scale, and is the answer official?",
        "a": "Yes, it uses the standard US 4.0 letter scale, and no, it is not official. GPA policies, rounding, and plus/minus weighting vary by institution, so treat the required average as a reliable estimate for planning your semester and confirm specifics with your academic advisor or registrar."
      },
      {
        "q": "How many credits should I enter as 'remaining'?",
        "a": "Enter the credits you can still earn before you want to hit the goal — often one semester (around 12 to 15 credits) or a full year. Fewer remaining credits make a target harder to move; more remaining credits make it easier. Testing different remaining-credit amounts is the best way to find a realistic timeline."
      },
      {
        "q": "What if I need to plan around AP, Honors, or my running cumulative total?",
        "a": "For weighted courses, use the weighted GPA calculator, which adds Honors (+0.5) and AP/IB (+1.0) bonuses per course. To first work out the current cumulative GPA you will type in here, the cumulative GPA calculator combines a prior GPA and credits with a new term."
      }
    ],
    "howto": [
      "Switch to the 'What GPA do I need?' mode (this page loads it for you) so the tool calculates backward from a goal instead of adding up past grades.",
      "Enter your current cumulative GPA and the number of credits you have already completed — check your transcript or student portal for both.",
      "Enter your goal cumulative GPA and the credits remaining before you want to reach it (usually the next semester or year).",
      "Read the required average it returns: this is the GPA you must average over your remaining credits, along with a note telling you if it is already achieved or not possible on a 4.0 scale.",
      "If the target is out of reach for one term, increase the remaining credits to spread it across more semesters, or adjust the goal, and rerun to find a realistic plan."
    ]
  },
  "gpa-calculator/weighted": {
    "toolSlug": "gpa-calculator",
    "flagshipName": "GPA Calculator",
    "flagshipUrl": "/education/gpa-calculator",
    "flagshipDesc": "The full calculator — weighted, cumulative and the target planner.",
    "clusterLabel": "GPA calculators",
    "updated": "2026-09-07",
    "url": "/gpa-calculator/weighted",
    "crumbName": "Weighted",
    "toolProps": {
      "initialWeighted": true
    },
    "siblings": [
      {
        "name": "What GPA Do I Need",
        "url": "/gpa-calculator/what-gpa-do-i-need"
      },
      {
        "name": "Cumulative GPA",
        "url": "/gpa-calculator/cumulative"
      },
      {
        "name": "College GPA",
        "url": "/gpa-calculator/college"
      }
    ],
    "h1": "Weighted GPA Calculator (AP, IB & Honors)",
    "seoTitle": "Weighted GPA Calculator: AP, IB & Honors",
    "metaDescription": "Free weighted GPA calculator. Turn on weighting, tag each class AP/IB (+1.0) or Honors (+0.5), and see your boosted GPA on the 4.0 scale instantly.",
    "lede": "This weighted GPA calculator adds the AP, IB, and Honors bonuses your grades earn, so a demanding schedule shows up as the higher number it actually is. Turn on the Weighted checkbox, tag each course by type, and watch your weighted GPA update live on the standard US 4.0 scale.",
    "about": "A weighted GPA rewards course difficulty, and this page opens with the Weighted checkbox already on so you can feel that difference straight away. Add each class with its letter grade (A+ through F), enter its credit hours, then use the Type dropdown to mark it Regular, Honors, or AP/IB. The calculator takes the grade's base value on the 4.0 scale, adds +0.5 for an Honors course or +1.0 for an AP or IB course, weights that boosted value by credit hours, and returns your weighted GPA as you type. Nothing is uploaded and there is no sign-up; every number is computed in your browser.\n\nThe reason a weighted GPA can climb above 4.0 is exactly those bonuses. An A in a regular class is worth 4.0, but the same A in an AP or IB class counts as 5.0 here, and an A in an Honors class counts as 4.5. Load a schedule full of A grades in advanced courses and the credit-weighted average lands north of 4.0 — that is the point of weighting, and it is why colleges often recalculate to their own scale. Switch every course back to Regular (or clear the checkbox) and you will see the unweighted figure, where an A is capped at 4.0 no matter how hard the class was. Comparing the two side by side is the fastest way to understand what your transcript's weighting is really adding.\n\nOne honest caveat: this tool uses the common US 4.0 letter scale with the widely used +0.5 Honors and +1.0 AP/IB bonuses, not the exact weighting policy of every school. Some districts weight on a 5.0 base, add different bonus amounts, or weight only certain courses, and percentage-based or non-US systems work differently still. Treat the result as a solid estimate for planning and self-checking, and confirm against your official transcript for anything that counts. It is one mode of the same GPA Calculator — if you want the plain overall number instead, the cumulative GPA page combines your prior GPA with this term, and if you are chasing a goal, the \"what GPA do I need\" planner works the reverse calculation.",
    "faq": [
      {
        "q": "How does this weighted GPA calculator handle AP, IB, and Honors classes?",
        "a": "With the Weighted checkbox on, each course gets a Type dropdown. Mark a class Honors and the calculator adds +0.5 to its grade value; mark it AP or IB and it adds +1.0; leave it Regular for no bonus. Those boosted values are then averaged by credit hours, so an A in an AP class contributes 5.0 and an A in Honors contributes 4.5."
      },
      {
        "q": "Why is my weighted GPA higher than 4.0?",
        "a": "Because the AP/IB (+1.0) and Honors (+0.5) bonuses push individual course values above the normal 4.0 ceiling. An A in an AP or IB class counts as 5.0 on this tool, so a schedule of strong grades in advanced courses averages out above 4.0. That is expected behavior for a weighted GPA and the main thing that separates it from an unweighted one."
      },
      {
        "q": "What is the difference between weighted and unweighted GPA?",
        "a": "Unweighted GPA caps every A at 4.0 regardless of how hard the class is. Weighted GPA adds bonus points for course rigor, so harder classes can raise your average above 4.0. To see both here, calculate with the Weighted box on, then turn it off (or set every Type to Regular) and the same courses give you the unweighted figure."
      },
      {
        "q": "How much does an AP or Honors class add to my GPA?",
        "a": "Per course, this tool adds +1.0 for AP or IB and +0.5 for Honors on top of the grade's base 4.0-scale value. The actual effect on your overall GPA depends on how many credit hours that course carries relative to your others, since the average is credit-weighted, not a simple mean of every class."
      },
      {
        "q": "Does it use a 5.0 scale for weighted GPA?",
        "a": "Not as a base. This calculator starts from the standard US 4.0 letter scale and adds the +0.5 and +1.0 bonuses, which is why an A in an AP class effectively reaches 5.0. If your school weights on a different base or uses different bonus amounts, treat the result as an estimate and check your transcript."
      },
      {
        "q": "Can I mix weighted and unweighted courses in the same term?",
        "a": "Yes. Set each course's Type independently — some Regular, some Honors, some AP/IB — and the calculator applies the right bonus to each before averaging. That mirrors a real schedule where only some of your classes carry extra weight."
      },
      {
        "q": "Is this weighted GPA an official number?",
        "a": "Treat it as an accurate estimate, not an official record. It uses the common US 4.0 scale with standard AP/IB and Honors bonuses, but schools set their own weighting policies, so your transcript is the source of truth. It is great for checking your own math and planning next term."
      },
      {
        "q": "How do I get my overall GPA across all my terms?",
        "a": "Use the cumulative GPA page of this same calculator, where you enter your prior cumulative GPA and completed credits alongside this term to get a new overall number. If your goal is to lift that number to a target, the 'what GPA do I need' planner tells you the average you must hit in your remaining credits."
      }
    ],
    "howto": [
      "Leave the Weighted checkbox on (it is preset for this page) so the Type dropdown and bonuses are active.",
      "Add a row for each course: an optional name, its letter grade from A+ to F, and its credit hours.",
      "Set each course's Type — Regular for no bonus, Honors for +0.5, or AP/IB for +1.0 — to match its rigor.",
      "Read your weighted GPA as it updates live; it can exceed 4.0 when advanced courses carry high grades.",
      "Uncheck Weighted or set every Type to Regular to compare against your unweighted 4.0-scale GPA."
    ]
  },
  "gpa-calculator/cumulative": {
    "toolSlug": "gpa-calculator",
    "flagshipName": "GPA Calculator",
    "flagshipUrl": "/education/gpa-calculator",
    "flagshipDesc": "The full calculator — weighted, cumulative and the target planner.",
    "clusterLabel": "GPA calculators",
    "updated": "2026-09-07",
    "url": "/gpa-calculator/cumulative",
    "crumbName": "Cumulative",
    "toolProps": {},
    "siblings": [
      {
        "name": "What GPA Do I Need",
        "url": "/gpa-calculator/what-gpa-do-i-need"
      },
      {
        "name": "Weighted GPA",
        "url": "/gpa-calculator/weighted"
      },
      {
        "name": "College GPA",
        "url": "/gpa-calculator/college"
      }
    ],
    "h1": "Cumulative GPA Calculator",
    "seoTitle": "Cumulative GPA Calculator - Overall GPA Free",
    "metaDescription": "Free cumulative GPA calculator: combine your prior overall GPA and completed credits with this term's grades to get your new cumulative GPA on the 4.0 scale.",
    "lede": "This cumulative GPA calculator combines the overall GPA you already carry with the grades you're earning this term, so you see your new cumulative GPA the moment a semester ends instead of guessing.",
    "about": "A cumulative GPA is your grade point average across every term you've completed, not just the one in front of you. This page presets the free GPA Calculator to its Calculate GPA mode with the prior-cumulative fields ready: you add this term's courses (grade and credit hours), then enter your Prior cumulative GPA and the Credits completed so far. The tool weights your prior work by those completed credits, adds this term's grade points, and returns a New cumulative GPA alongside your total credits. It's the honest math a transcript uses, run live in your browser with nothing to sign up for and nothing uploaded.\n\nThe reason a single strong or weak semester moves your cumulative GPA less than students expect is exactly this credit weighting. If you've finished 90 credits at a 3.20 and add 15 credits this term, those 15 credits are only about a sixth of your record, so even a perfect term nudges the overall number rather than transforming it. Watching the New cumulative GPA update as you change grades makes that leverage visible: early on, each term swings your overall GPA hard; later, your history anchors it. Seeing both your term GPA and your cumulative GPA side by side is the whole point of separating semester from cumulative.\n\nTwo honest caveats. This calculator uses the common US 4.0 letter scale (A/A+ = 4.0, A- = 3.7, B+ = 3.3, down to F = 0.0); it does not model percentage grades, 5.0 bases, or the exact plus/minus rules of every registrar, so treat its cumulative figure as a close estimate and let your official transcript be the authority. It also assumes your prior cumulative GPA and completed-credit count are accurate, since the whole result pivots on those two numbers. If you want to plan forward instead of look back, the sibling <a href=\"/gpa-calculator/what-gpa-do-i-need\">what GPA do I need calculator</a> reverses the math, and the <a href=\"/gpa-calculator/college\">college GPA calculator</a> covers semester-plus-cumulative planning and Latin-honors thresholds.",
    "faq": [
      {
        "q": "How does this cumulative GPA calculator combine my old GPA with this term?",
        "a": "It multiplies your prior cumulative GPA by your completed credits to recover your total grade points, adds the grade points you earned this term (grade times credits for each course), then divides by your combined credit total. That credit-weighted method is exactly how a registrar rolls a new term into an overall GPA."
      },
      {
        "q": "What is the difference between a semester GPA and a cumulative GPA?",
        "a": "A semester (or term) GPA covers only the courses you took in one term. A cumulative GPA averages every graded term together, weighted by credits. This tool shows the term GPA at the top and the New cumulative GPA below once you enter your prior GPA and completed credits, so you can compare the two directly."
      },
      {
        "q": "What do I enter for credits completed so far?",
        "a": "Enter the total number of graded credit hours behind your prior cumulative GPA, not counting this term. If your transcript shows a 3.30 over 60 credits, you enter 60. The count matters because it decides how much weight your history carries against this term's grades."
      },
      {
        "q": "Why does one good semester barely move my cumulative GPA?",
        "a": "Because your cumulative GPA is weighted by credits, and your completed credits usually outnumber a single term's. A great term is only a small slice of a long record, so it shifts the overall number gradually. The more credits you've already banked, the harder your cumulative GPA is to move in either direction."
      },
      {
        "q": "Does the cumulative calculator support weighted AP, IB, or Honors courses?",
        "a": "Yes. Turn on the Weighted checkbox and a Type dropdown appears on each course so you can add Honors (+0.5) or AP/IB (+1.0) to that course's grade points. Note that a weighted term can push a term GPA above 4.0; the dedicated weighted GPA calculator page explains how and why that happens."
      },
      {
        "q": "Is this cumulative GPA accurate for my school?",
        "a": "It's an accurate estimate on the standard US 4.0 letter scale, but it can't match every institution. Schools differ on plus/minus values, whether retakes replace or average, and how transfer or pass/fail credits count. Use this number to plan and check your progress, and rely on your official transcript for the figure of record."
      },
      {
        "q": "Can I project my cumulative GPA into future terms?",
        "a": "To plan ahead rather than record the past, switch to the What GPA do I need mode or use the target-planner page. It takes your current cumulative GPA, completed credits, a goal, and remaining credits, then tells you the average you'd need going forward, with an honest note when a goal isn't reachable on a 4.0 scale."
      },
      {
        "q": "Do I have to enter a prior GPA to use this page?",
        "a": "No. If you leave the Prior cumulative GPA and Credits completed fields blank, the tool simply shows this term's GPA. The New cumulative GPA only appears once both prior fields are filled, so first-term students can use the same page as a plain semester calculator."
      }
    ],
    "howto": [
      "Keep the tool on Calculate GPA mode, then add each course from this term with its letter grade and credit hours; the term GPA updates live as you type.",
      "Scroll to the Prior cumulative GPA field and enter the overall GPA from your latest transcript (for example 3.42).",
      "In Credits completed so far, enter the total graded credits behind that prior GPA (for example 60) - not including this term's courses.",
      "Read the New cumulative GPA and Total credits shown together; they combine your history and this term into your overall average.",
      "Adjust a grade or credit value to see how a stronger or weaker term shifts your cumulative GPA, and treat the 4.0-scale result as an estimate against your official record."
    ]
  },
  "gpa-calculator/college": {
    "toolSlug": "gpa-calculator",
    "flagshipName": "GPA Calculator",
    "flagshipUrl": "/education/gpa-calculator",
    "flagshipDesc": "The full calculator — weighted, cumulative and the target planner.",
    "clusterLabel": "GPA calculators",
    "updated": "2026-09-07",
    "url": "/gpa-calculator/college",
    "crumbName": "College",
    "toolProps": {},
    "siblings": [
      {
        "name": "What GPA Do I Need",
        "url": "/gpa-calculator/what-gpa-do-i-need"
      },
      {
        "name": "Weighted GPA",
        "url": "/gpa-calculator/weighted"
      },
      {
        "name": "Cumulative GPA",
        "url": "/gpa-calculator/cumulative"
      }
    ],
    "h1": "College GPA Calculator",
    "seoTitle": "College GPA Calculator | Free 4.0-Scale University Tool",
    "metaDescription": "Free college GPA calculator on the 4.0 scale. Add each course with its letter grade and credit hours to get your semester and cumulative university GPA instantly.",
    "lede": "This college GPA calculator turns a semester of university courses into a single grade point average on the standard US 4.0 scale. Add a row for each class, pick its letter grade, and enter the credit hours — the tool weights every course by its credits and shows your semester GPA live as you type. Add your prior cumulative GPA and credits completed and it folds this term into your running overall number. It works entirely in your browser: no sign-up, nothing uploaded, and it treats the result as an estimate since exact GPA rules vary by school.",
    "about": "College GPA is different from the high-school version in one way that trips people up: credit hours matter more, and they are rarely equal. A three-credit seminar and a five-credit lab-plus-lecture do not count the same toward your university GPA, so a straight average of your letter grades will be wrong. This college GPA calculator uses credit-weighting the way a registrar does — it multiplies each grade's point value by that course's credit hours, sums those grade points across all your classes, and divides by your total credits. Enter one term's courses to see that semester's GPA; the running credit total beside the result lets you sanity-check that you actually logged 15 or 16 credits and not 12.\n\nThe number that follows you around campus, though, is your cumulative GPA, and this tool builds it without making you re-type your whole transcript. Fill in the optional \"Prior cumulative GPA\" and \"Credits completed\" fields with the figures from your latest transcript, add just this term's classes, and the calculator combines them into a new overall GPA — the same math your university runs at the end of the term. That is the figure academic standing, financial aid renewal, and Latin honors are read from, so seeing it move before grades post is the whole point. This college page is one preset of the same GPA Calculator; the cumulative GPA page zooms in on combining a prior GPA with a new term, and the \"what GPA do I need\" page runs the reverse calculation when you have a target to hit.\n\nTwo honesty notes about a university GPA. First, the tool uses the common US 4.0 letter scale — A+/A at 4.0, A- at 3.7, B+ at 3.3, on down to D at 1.0 and F at 0.0. It does not model percentage grading, a 4.3 scale where A+ counts above 4.0, or the plus/minus quirks of every individual college, so read the output as a close estimate rather than an official transcript figure. Second, honor thresholds are school-specific. Dean's List is commonly a 3.5+ term GPA, and Latin honors at graduation often fall near cum laude 3.5, magna cum laude 3.7, and summa cum laude 3.9 — but the exact cutoffs, and whether they use raw GPA or class percentile, differ at every institution, so check your catalog before treating a line as crossed. If your college adds extra weight for honors-level courses, flip on the Weighted checkbox to add an Honors (+0.5) or AP/IB (+1.0) bonus per course.",
    "faq": [
      {
        "q": "How does this college GPA calculator work on the 4.0 scale?",
        "a": "It assigns each letter grade a point value on the standard US 4.0 scale — A+/A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, and so on down to D = 1.0 and F = 0.0 — then multiplies each course's points by its credit hours. It adds up all those grade points and divides by your total credits to return your university GPA. Because it is credit-weighted, higher-credit courses move your GPA more than one-credit ones."
      },
      {
        "q": "How do I calculate my cumulative university GPA?",
        "a": "Enter this semester's courses, then fill in the optional Prior cumulative GPA and Credits completed fields with the numbers from your latest transcript. The calculator combines your existing grade points with the new term and shows an updated cumulative GPA — the same overall figure your registrar computes. You don't need to re-enter every past course, just your standing GPA and credit total."
      },
      {
        "q": "What's the difference between my semester GPA and cumulative GPA?",
        "a": "Semester GPA covers only the courses in one term, so it swings a lot with a single bad or great grade. Cumulative GPA averages every credit you have ever earned, so it moves slowly and is the number used for academic standing, honors, and aid. This tool shows the semester figure from the courses you add and the cumulative figure once you enter your prior GPA and completed credits."
      },
      {
        "q": "Why do credit hours matter so much for a college GPA?",
        "a": "Because college courses carry different credit loads, and GPA is a weighted average, not a simple one. A 4-credit course affects your GPA by a third more than a 3-credit course with the same grade. If you averaged your letter grades without weighting by credits, the result would be off — so enter each course's real credit-hour value for an accurate university GPA."
      },
      {
        "q": "What GPA do I need for Dean's List or Latin honors?",
        "a": "It varies by school, so confirm in your catalog, but Dean's List is commonly a term GPA of 3.5 or higher, and graduation honors often sit near cum laude 3.5, magna cum laude 3.7, and summa cum laude 3.9. Some colleges use class rank or percentiles instead of fixed cutoffs. Use this calculator to see where your cumulative GPA lands relative to your own school's published thresholds."
      },
      {
        "q": "Does this match what my college puts on my transcript?",
        "a": "It closely estimates it but should not be treated as official. The tool uses the common US 4.0 letter scale and credit-weighting, which is what most universities use, but individual schools handle plus/minus grades, repeated courses, pass/fail credits, and rounding differently. Treat the result as a reliable planning estimate and rely on your registrar's figure as the record of truth."
      },
      {
        "q": "Can it handle a full course load of any size?",
        "a": "Yes. There is no limit on how many course rows you can add, so it works for a light semester, a full 15–18 credit load, or a term with labs and one-credit add-ons. Use Add course to insert rows, remove any row you don't need, and Clear all to start a fresh calculation. The credit total beside the result helps you confirm you entered every class."
      },
      {
        "q": "How is this different from the weighted GPA calculator page?",
        "a": "This college page presets the tool for semester and cumulative university GPA on the standard 4.0 scale, where an A is 4.0 regardless of course difficulty. The weighted GPA page presets the honors and AP/IB bonuses on by default. You can still weight courses here by ticking the Weighted checkbox — it's the same GPA Calculator, just framed for a straightforward college GPA first."
      }
    ],
    "howto": [
      "Add a row for each college course this semester, entering the class name (optional) and choosing its letter grade from A+ down to F on the 4.0 scale.",
      "Enter the credit hours for every course exactly as your syllabus or registration lists them — a 4-credit class must count more than a 3-credit one for the GPA to be right.",
      "Read your semester GPA, which recalculates live; the running credit total beside it confirms you logged the full course load.",
      "To get your new cumulative university GPA, fill in the optional prior cumulative GPA and credits completed from your latest transcript so the tool folds this term into your overall record.",
      "If your school gives honors courses extra weight, turn on the Weighted checkbox and set each course's type to add the Honors (+0.5) or AP/IB (+1.0) bonus."
    ]
  },
  "chart-maker/bar-graph": {
    "toolSlug": "chart-maker",
    "flagshipName": "Chart Maker",
    "flagshipUrl": "/image/chart-maker",
    "flagshipDesc": "The full maker — bar, line, pie and scatter charts.",
    "clusterLabel": "chart makers",
    "updated": "2026-09-07",
    "url": "/chart-maker/bar-graph",
    "crumbName": "Bar Graph",
    "toolProps": {
      "initialType": "bar"
    },
    "siblings": [
      {
        "name": "Pie Chart Maker",
        "url": "/chart-maker/pie-chart"
      },
      {
        "name": "Line Graph Maker",
        "url": "/chart-maker/line-graph"
      },
      {
        "name": "Scatter Plot Maker",
        "url": "/chart-maker/scatter-plot"
      }
    ],
    "h1": "Free Bar Graph Maker — Paste Your Numbers, Download a Bar Chart PNG",
    "seoTitle": "Bar Graph Maker — Free Bar Chart PNG, No Signup",
    "metaDescription": "Free bar graph maker: paste a list of label, value lines and download a clean bar chart PNG. No signup, no watermark, nothing uploaded — it all runs in your browser.",
    "lede": "This bar graph maker turns a short list of categories and numbers into a clean bar chart image you can download in one click. Type one \"label, value\" per line — say \"Mon, 12\" — and the bars redraw live as you go. When it looks right, hit download and you get a plain PNG with no watermark and no account. It is the fast way to compare a handful of categories and drop the picture into a slide, doc, or message.",
    "about": "A bar chart is the right pick when you want to compare a value across separate categories — sales by product, votes by option, visitors by day of the week. Each bar's height maps to its number, so the eye reads \"which is biggest\" and \"by how much\" in a glance. That is exactly what this bar graph maker is built for: you paste a label and a value on each line, the tool auto-scales the y-axis to your largest bar, prints the value on top of each bar, and labels each one underneath. Pick any bar color, add an optional title, and it all renders live on an HTML canvas inside your browser.\n\nBeing honest about what this is: it makes one clean static PNG, not an interactive dashboard. You type the numbers in (there is no CSV or Excel upload), it draws a single series of bars — one bar per line, not grouped or stacked comparisons of several data sets on the same chart — and the output is a flat image, not an SVG or an embeddable widget. There is no fine axis or legend customization either. That trade is deliberate. It is the tool you reach for when you have five or ten numbers and want a shareable chart in ten seconds, not when you are building a live report. Nothing you type is uploaded; the chart is drawn on your device and the download is generated locally.\n\nThis is one preset of everyboringtool.com's Chart Maker, which also does line, pie, and scatter from the same paste-your-data box. If your numbers are a trend over time rather than separate categories, the Line graph maker connects them into a trend line; if they are slices of a single whole and add up to 100%, the Pie chart maker auto-colors each slice with a percentage legend. Bars are the workhorse for straight category-versus-category comparison, which is why it is the default here — but the toggle lets you switch chart type without re-typing your data.",
    "faq": [
      {
        "q": "Is this bar graph maker really free with no signup?",
        "a": "Yes. There is no account, no login, and no watermark on the image. You paste your data, the bar chart draws in your browser, and you download a plain PNG. Nothing is uploaded to a server."
      },
      {
        "q": "How do I enter my data for a bar chart?",
        "a": "Type one 'label, value' pair per line in the data box — for example 'Mon, 12'. The part before the comma becomes the bar's label, the number after it becomes the bar's height. There is no file upload; you paste or type the numbers directly."
      },
      {
        "q": "Can I upload a CSV or Excel file?",
        "a": "No. This is a paste-in tool, not a spreadsheet importer. Copy your labels and values in as 'label, value' lines instead. It keeps the tool instant and fully in-browser, but it does mean there is no CSV, XLSX, or Google Sheets upload."
      },
      {
        "q": "Can I put two data sets on the same bar chart?",
        "a": "No — it draws a single series, one bar per line. There are no grouped or stacked bars comparing multiple data sets on one chart. If you need to compare two series side by side, this tool is not the right fit; it is built for a single set of category values."
      },
      {
        "q": "When should I use a bar chart instead of a line or pie chart?",
        "a": "Use a bar chart to compare a value across separate categories — products, options, days, regions — especially when the categories are not a time sequence. Use a line graph for a trend over time, and a pie chart when your values are parts of one whole that sum to 100%."
      },
      {
        "q": "What format is the download, and can I edit it later?",
        "a": "You get a static PNG image drawn on a canvas. It is a finished picture, not an editable or interactive file, and it is not SVG. To change the chart, edit your numbers in the tool and download again — re-generating takes seconds."
      },
      {
        "q": "What's a common mistake to avoid with bar charts?",
        "a": "Not starting the value axis at zero is the classic one — truncating it exaggerates differences. This tool auto-scales from zero to your largest value, which keeps bar heights honest. Also avoid cramming in too many categories; past a dozen bars, labels get cramped and the comparison gets hard to read."
      },
      {
        "q": "Is my data private?",
        "a": "Yes. The chart is drawn entirely in your browser on an HTML canvas, and the PNG is generated on your device. Your numbers are never sent anywhere or stored."
      }
    ],
    "howto": [
      "Choose the Bar preset (it is selected by default) using the chart-type toggle at the top.",
      "In the data box, type one category per line as 'label, value' — for example 'Product A, 40' then 'Product B, 25'. The bars redraw live as you type.",
      "Optionally add a title and pick a bar color with the color picker.",
      "Check the live preview — each bar is labeled underneath and shows its value on top, and the y-axis auto-scales to your largest number.",
      "Click Download PNG to save the finished bar chart image to your device — no signup, no watermark."
    ]
  },
  "chart-maker/pie-chart": {
    "toolSlug": "chart-maker",
    "flagshipName": "Chart Maker",
    "flagshipUrl": "/image/chart-maker",
    "flagshipDesc": "The full maker — bar, line, pie and scatter charts.",
    "clusterLabel": "chart makers",
    "updated": "2026-09-07",
    "url": "/chart-maker/pie-chart",
    "crumbName": "Pie Chart",
    "toolProps": {
      "initialType": "pie"
    },
    "siblings": [
      {
        "name": "Bar Graph Maker",
        "url": "/chart-maker/bar-graph"
      },
      {
        "name": "Line Graph Maker",
        "url": "/chart-maker/line-graph"
      },
      {
        "name": "Scatter Plot Maker",
        "url": "/chart-maker/scatter-plot"
      }
    ],
    "h1": "Pie Chart Maker",
    "seoTitle": "Pie Chart Maker - Free, No Signup, Instant PNG",
    "metaDescription": "Free pie chart maker and generator. Paste a label, value list, get auto-colored slices, and download a clean PNG. No signup, no watermark, all in your browser.",
    "lede": "This free pie chart maker turns a short list of labels and values into an auto-colored pie chart you can download as a PNG in one click. Paste your numbers, watch the slices redraw live as you type, add a title, and save the image. No account, no watermark, and nothing ever leaves your browser.",
    "about": "This is a pie chart generator built for one job: taking a small parts-of-a-whole breakdown and turning it into a shareable picture, fast. You paste your data as one \"label, value\" per line, for example \"Rent, 1200\" then \"Food, 400\" then \"Transport, 250\" on their own lines. Each row becomes a slice, sized in proportion to its share of the total, and the maker auto-colors every slice for you so you never pick colors one at a time. A live preview redraws as you type, so you can fix a typo or add a row and see the pie change instantly before you download.\n\nA pie chart earns its place when your categories add up to a meaningful whole and you want to show how that whole is divided: budget by spending category, survey answers by response, market share by brand, or traffic by source. The strength of a pie is that it reads at a glance as \"this is roughly a third, that's about half.\" The weakness is that the human eye is bad at comparing similar-sized wedges, so a pie is the wrong choice once you have more than about five or six slices, or when several values are close together. When that happens, a bar chart is almost always clearer, because bars sit on a shared baseline and are easy to rank by length. If your data is a trend over time rather than a share of a total, reach for the line graph instead. This tool is part of the same Chart Maker as the sibling Bar Graph and Line Graph presets, so you can switch types without relearning anything.\n\nBe clear on what this is and isn't. It produces a clean static PNG image, not an interactive or embeddable chart, and not an SVG. You paste your numbers as text; there's no CSV or Excel file upload, and a pie is single-series by nature, so it charts one column of values. There's no fine control over legend placement or label formatting beyond the title and the auto-assigned slice colors. If you need a small, honest, no-signup way to turn a handful of numbers into a pie chart picture for a slide, a doc, or a post, that's exactly the gap this fills, without the account wall that Canva, Visme, or Adobe put in front of the same task.",
    "faq": [
      {
        "q": "Is this pie chart maker really free?",
        "a": "Yes, completely free with no account, no trial, and no watermark on your image. The chart is drawn in your browser on a canvas and nothing is uploaded, so you can make as many pie charts as you want."
      },
      {
        "q": "How do I enter my data for a pie chart?",
        "a": "Paste one 'label, value' per line into the data box. For example: 'Rent, 1200' on the first line, 'Food, 400' on the second, and so on. Each line becomes one slice, sized by its share of the total. There is no file upload; you paste the numbers directly."
      },
      {
        "q": "Do I have to calculate the percentages myself?",
        "a": "No. You enter raw values like 1200 or 400 and the pie chart generator sizes each slice by its proportion of the total automatically. You do not need to convert your numbers to percentages first."
      },
      {
        "q": "Can I choose the slice colors?",
        "a": "The pie preset auto-colors each slice for you so a multi-slice chart looks right without manual work. The color picker sets a single color and is most useful on the Bar and Line presets; on a pie, the automatic per-slice coloring does the job."
      },
      {
        "q": "When should I not use a pie chart?",
        "a": "Avoid a pie when you have more than about five or six categories, or when several values are close in size, because similar wedges are hard to compare by eye. In those cases use a bar chart, which ranks values on a shared baseline. Use a line graph instead if your data is a trend over time."
      },
      {
        "q": "What file do I get when I download?",
        "a": "You get a static PNG image of your pie chart with one click. It is a flat picture, not an interactive, embeddable, or SVG chart, which makes it easy to drop into a slide deck, document, email, or social post."
      },
      {
        "q": "Can I put more than one set of values in the same pie?",
        "a": "No, a pie chart is single-series by design; it shows how one column of values divides a single whole. If you need to compare two sets of numbers side by side, a grouped bar chart is the better fit, though this tool charts one series at a time."
      },
      {
        "q": "Is my data private?",
        "a": "Yes. Everything runs locally in your browser and the chart is rendered on an HTML canvas. Your numbers are never sent to a server, so nothing you type is uploaded or stored anywhere."
      }
    ],
    "howto": [
      "Select the Pie chart type using the toggle at the top of the Chart Maker.",
      "Paste your data as one 'label, value' per line, for example 'Rent, 1200' then 'Food, 400' on separate lines, one row per slice.",
      "Optionally add a title so the chart is self-explanatory when you share it.",
      "Watch the live preview auto-color and size each slice as you type, and adjust any row until the pie looks right.",
      "Click download to save your pie chart as a PNG image, with no signup and no watermark."
    ]
  },
  "chart-maker/line-graph": {
    "toolSlug": "chart-maker",
    "flagshipName": "Chart Maker",
    "flagshipUrl": "/image/chart-maker",
    "flagshipDesc": "The full maker — bar, line, pie and scatter charts.",
    "clusterLabel": "chart makers",
    "updated": "2026-09-07",
    "url": "/chart-maker/line-graph",
    "crumbName": "Line Graph",
    "toolProps": {
      "initialType": "line"
    },
    "siblings": [
      {
        "name": "Bar Graph Maker",
        "url": "/chart-maker/bar-graph"
      },
      {
        "name": "Pie Chart Maker",
        "url": "/chart-maker/pie-chart"
      },
      {
        "name": "Scatter Plot Maker",
        "url": "/chart-maker/scatter-plot"
      }
    ],
    "h1": "Free Line Graph Maker",
    "seoTitle": "Line Graph Maker - Free Line Chart Maker, No Signup",
    "metaDescription": "Free line graph maker: paste a label, value list, see a live preview, and download a clean PNG line chart. No signup, no watermark, nothing uploaded.",
    "lede": "This free line graph maker turns a short list of numbers into a clean line chart image you can download in one click. Paste your data as one \"label, value\" per line, add a title, pick a color, and the live preview redraws as you type. When it looks right, download a crisp PNG. No account, no watermark, and nothing ever leaves your browser.",
    "about": "A line graph is the right chart when you want to show how a single measurement changes across an ordered sequence, most often time. The connected points draw the eye along the trend, so a reader instantly sees whether the line climbs, falls, plateaus, or spikes. That is exactly what this maker is built for: you paste your data as one \"label, value\" pair per line, for example \"Jan, 40\" then \"Feb, 52\" then \"Mar, 48\", and each value becomes a point plotted in the order you typed it. The tool connects those points into a single line and redraws the preview live as you edit, so you can fix a typo or drop a stray row and watch the shape update immediately.\n\nKeep the input honest to what a line chart implies: your labels should be in a meaningful order, because the line literally connects each point to the next one down your list. Dates, months, quarters, weeks, or sequential steps work well; a set of unrelated categories does not, since drawing a line between \"Apples\" and \"Oranges\" suggests a progression that isn't real. If your labels have no natural order and you're comparing separate things, a bar chart is the better fit, and our sibling Bar Graph Maker uses the same paste-a-list workflow. A few practical tips: try to space your time points evenly, avoid cramming so many labels that they overlap, and remember that a line implies continuity between readings, so don't connect points that come from genuinely disconnected events.\n\nBe clear on what this tool is and isn't. It produces a clean static PNG of one line, drawn on an HTML canvas entirely in your browser. You paste the numbers by hand, so there is no CSV or Excel file upload, and it plots a single series, so you can't overlay two lines to compare, say, this year against last year on the same axes. The output is a flat image, not an SVG, an interactive widget, or an embeddable chart, and there's no fine control over axis ticks, gridlines, or legends. What you get in return is speed and zero friction: no sign-up wall, no watermark stamped across your download, and a shareable chart picture in seconds. For a single trend line you want to drop into a slide, a doc, or a message, that trade is usually worth it. If your data is really about a relationship between two numeric variables rather than a trend over time, use the Scatter Plot Maker instead, which takes \"x, y\" pairs.",
    "faq": [
      {
        "q": "How do I make a line graph with this tool?",
        "a": "Choose the Line chart type, then paste your data one \"label, value\" pair per line, such as \"Mon, 12\" and \"Tue, 18\". Add an optional title, pick a line color, and the live preview draws the connected line as you type. Click download to save it as a PNG."
      },
      {
        "q": "What format does the line graph maker expect for data?",
        "a": "One entry per line, written as label then comma then value, for example \"Q1, 120\". The label becomes the point's position along the bottom axis and the value sets its height. Points are plotted in the exact order you list them and then connected into a single line."
      },
      {
        "q": "Can I upload a CSV or Excel file?",
        "a": "No. This is a paste-in tool, so you copy your numbers directly into the text box as \"label, value\" lines. There is no file upload. For a small table that you can paste in a few seconds, this is usually faster than importing a file anyway."
      },
      {
        "q": "Can I put two lines on the same graph to compare series?",
        "a": "Not currently. The line graph maker plots a single series, so it draws one line per chart. If you need to compare two trends, you would make two separate charts. Overlaying multiple lines on shared axes is not supported."
      },
      {
        "q": "When should I use a line graph instead of a bar chart?",
        "a": "Use a line graph when your labels are in a natural order, usually time, and you want to show how one value rises or falls across that sequence. Use a bar chart when you're comparing separate categories that have no inherent order. Our Bar Graph Maker handles that case with the same paste workflow."
      },
      {
        "q": "Is the line chart image free, and is there a watermark?",
        "a": "Yes, it's completely free with no sign-up and no watermark. The chart is drawn on a canvas in your browser and downloaded as a clean PNG. Nothing is uploaded to a server, so your numbers stay on your device."
      },
      {
        "q": "What kind of file do I get when I download?",
        "a": "You get a static PNG image of your line chart. It's a flat picture, not an SVG, an interactive chart, or an embeddable widget, so it's ideal for pasting into slides, documents, or a chat rather than for further editing."
      },
      {
        "q": "Why do my points look out of order?",
        "a": "The line connects points in the order you list them, not by sorting values. If the line zig-zags unexpectedly, check that your rows are in the sequence you want, for example chronological by date, before you download."
      }
    ],
    "howto": [
      "Select the Line chart type at the top of the Chart Maker.",
      "Paste your data into the box, one \"label, value\" pair per line, in the order you want the line to follow, for example \"Jan, 40\" then \"Feb, 52\".",
      "Add an optional title and pick a line color; the preview redraws live as you type so you can catch typos or out-of-order rows.",
      "Check that your labels are in a meaningful sequence (dates or steps) since the line connects each point to the next one down the list.",
      "Click download to save your line graph as a clean PNG, with no signup and no watermark."
    ]
  },
  "chart-maker/scatter-plot": {
    "toolSlug": "chart-maker",
    "flagshipName": "Chart Maker",
    "flagshipUrl": "/image/chart-maker",
    "flagshipDesc": "The full maker — bar, line, pie and scatter charts.",
    "clusterLabel": "chart makers",
    "updated": "2026-09-07",
    "url": "/chart-maker/scatter-plot",
    "crumbName": "Scatter Plot",
    "toolProps": {
      "initialType": "scatter"
    },
    "siblings": [
      {
        "name": "Bar Graph Maker",
        "url": "/chart-maker/bar-graph"
      },
      {
        "name": "Pie Chart Maker",
        "url": "/chart-maker/pie-chart"
      },
      {
        "name": "Line Graph Maker",
        "url": "/chart-maker/line-graph"
      }
    ],
    "h1": "Scatter Plot Maker — Free, No Sign-Up, Instant PNG",
    "seoTitle": "Scatter Plot Maker — Free Online, No Sign-Up",
    "metaDescription": "Free scatter plot maker. Paste your \"x, y\" pairs, see a live scatter chart, and download a clean PNG. No sign-up, no watermark, nothing uploaded.",
    "lede": "This free scatter plot maker turns a list of \"x, y\" pairs into a clean scatter chart you can download as a PNG in one click. Paste one pair per line, watch it plot live in your browser, pick a point color, and save the image — no account, no watermark, and nothing ever leaves your device.",
    "about": "placeholder",
    "faq": [
      {
        "q": "Is this scatter plot maker really free?",
        "a": "Yes. It is completely free with no sign-up, no trial, and no watermark. You paste your data, get a live scatter chart, and download a PNG. There is no paid tier and no account step."
      },
      {
        "q": "How do I enter data for a scatter plot?",
        "a": "Type one \"x, y\" pair per line — the x value, a comma, then the y value, like \"3, 8\" on one line and \"5, 14\" on the next. Each line becomes one dot. There is no file upload; you paste the numbers as text, and the chart redraws live as you type."
      },
      {
        "q": "Can I upload a CSV or Excel file?",
        "a": "No — this tool does not import CSV or spreadsheet files. It is a paste-your-numbers tool. Copy the two columns you care about and paste them one pair per line. This keeps it instant and keeps your data on your device, since nothing is uploaded."
      },
      {
        "q": "Can I plot more than one group or series?",
        "a": "No. Each chart is a single series — one cloud of dots in one color. There is no grouped or multi-color scatter, and no separate legend for categories. If you need to compare two groups, make two separate PNGs."
      },
      {
        "q": "Does it draw a trend line or calculate correlation?",
        "a": "No. The maker plots your raw points and auto-scales the axes, but it does not add a regression line, R-squared, or a correlation number. You read the relationship visually from the shape of the point cloud. For statistical fitting, use a stats package."
      },
      {
        "q": "When should I use a scatter plot instead of a line graph?",
        "a": "Use a scatter plot when both axes are measured numeric variables and you want to see how they relate — for example ad spend vs. signups. Use the line graph maker instead when your x-axis is time or ordered steps and you want to trace a trend, since a line connects points in sequence while a scatter deliberately does not."
      },
      {
        "q": "What format is the download, and is there a watermark?",
        "a": "You get a clean PNG image (saved as scatter-chart.png) drawn on a canvas — no watermark, no logo, no sign-up. It is a static picture, not an interactive or embeddable SVG, so it is ready to drop into a slide, doc, or post."
      },
      {
        "q": "Is my data private?",
        "a": "Yes. The chart is drawn entirely in your browser on an HTML canvas. Your pasted pairs are never sent to a server or uploaded anywhere — everything happens locally on your device."
      }
    ],
    "howto": [
      "Select the Scatter toggle at the top of the Chart Maker so it expects \"x, y\" pairs.",
      "Paste your data one pair per line — the x value, a comma, then the y value, like \"3, 8\". Each line becomes one dot.",
      "Optionally add a title and pick a point color; the plot redraws live and auto-scales both axes as you type.",
      "Read the shape of the point cloud — an upward or downward diagonal signals a relationship, a shapeless blob signals none.",
      "Click Download PNG to save your scatter-chart.png — no sign-up, no watermark, nothing uploaded."
    ]
  },
  "inflation-calculator/salary-raise": {
    "toolSlug": "inflation-calculator",
    "flagshipName": "Inflation Calculator",
    "flagshipUrl": "/finance/inflation-calculator",
    "flagshipDesc": "The full calculator — buying power and beat-inflation modes.",
    "clusterLabel": "inflation tools",
    "updated": "2026-09-07",
    "url": "/inflation-calculator/salary-raise",
    "crumbName": "Raise vs Inflation",
    "toolProps": {
      "initialMode": "beat",
      "initialBeforeLabel": "Old salary ($)",
      "initialAfterLabel": "New salary ($)"
    },
    "siblings": [
      {
        "name": "Rent vs Inflation",
        "url": "/inflation-calculator/rent"
      },
      {
        "name": "Savings & Inflation",
        "url": "/inflation-calculator/savings"
      },
      {
        "name": "COLA Calculator",
        "url": "/inflation-calculator/cola"
      }
    ],
    "h1": "Is My Raise Beating Inflation? Real Raise Calculator",
    "seoTitle": "Is My Raise Beating Inflation? Real Raise Check",
    "metaDescription": "Is my raise beating inflation? Enter your old and new salary, the years, and an inflation rate to see your real raise vs nominal raise. Free, instant, no sign-up.",
    "lede": "Wondering \"is my raise beating inflation?\" This free calculator compares your old salary to your new salary against the inflation rate you enter, so you can see whether your pay actually gained buying power or just put bigger numbers on the same paycheck. You supply the inflation rate yourself (a long-run US average is around 3%, though recent years ran higher), and the tool does the real-versus-nominal math for you in seconds, entirely in your browser.",
    "about": "A raise that looks great on paper can still leave you behind. If prices climbed faster than your pay, that \"raise\" is really a pay cut wearing a nicer number. This page loads the Inflation Calculator in its \"Did it beat inflation?\" mode with the fields labeled Old salary and New salary, so it answers the exact question on your mind: did my raise beat inflation? Enter your previous salary, your new salary, the number of years between them, and an annual inflation rate, and it returns your nominal change percent (the raw raise), the inflation over the period percent, the salary you would need just to keep pace, and your real change percent, plus a plain verdict on whether you gained or lost buying power.\n\nThe distinction that matters is nominal versus real. A nominal raise is the headline: going from $60,000 to $63,000 is a 5% nominal raise. But if inflation ran 4% over that stretch, your keep-pace salary is about $62,400, so only the sliver above that is a genuine gain. Your real raise in that example is roughly 1%, not 5%. The calculator does exactly this: it computes the salary you would need to merely stand still against inflation, then shows how far above or below that line your new pay actually lands, so you are not fooled by a big number that quietly lost ground.\n\nOne honest caveat: the tool does not pull live official CPI data. You type in the inflation rate yourself, and the result is an estimate based on that rate using simple compound growth. That is a feature for this use case, because the \"right\" rate depends on your situation. You might use the headline national CPI for the year, or a figure closer to your own cost of living. Try a couple of rates to see how sensitive your real raise is. This salary-raise page is one preset of the same Inflation Calculator. If you want to check other pay decisions, the COLA page tests whether a cost-of-living adjustment kept pace, and the rent page compares a rent increase to inflation the same way.",
    "faq": [
      {
        "q": "How do I know if my raise is beating inflation?",
        "a": "Enter your old salary, your new salary, the number of years between them, and an annual inflation rate. The calculator shows your real change percent: if it is positive, your raise beat inflation and you gained buying power; if it is negative, prices outran your pay and you effectively took a cut in real terms. It also shows the exact salary you would have needed just to keep pace."
      },
      {
        "q": "What is the difference between a nominal raise and a real raise?",
        "a": "Your nominal raise is the raw percentage increase in the dollar amount, for example 5% if you go from $60,000 to $63,000. Your real raise subtracts inflation from that. If inflation was 4%, your real raise is only about 1%. The nominal number is what your offer letter says; the real number is what your money can actually buy. This tool reports both, plus the keep-pace amount in between."
      },
      {
        "q": "What raise do I need just to keep up with inflation?",
        "a": "You need enough to offset the cumulative price increase over the period. The calculator computes this as your keep-pace amount: your old salary grown by the inflation rate you enter, compounded over the number of years. Anything above that figure is a real gain; anything below it is a real loss. For a single year at 4% inflation, a $60,000 salary needs to reach about $62,400 just to stand still."
      },
      {
        "q": "Does this calculator use official CPI inflation data?",
        "a": "No. You enter the inflation rate yourself, and the result is an estimate based on that rate using simple compound growth, not a live official CPI figure. This is intentional, so you can test the rate that fits your situation, whether that is the national headline number or something closer to your own costs. Try a low and a high rate to see how much it changes your real raise."
      },
      {
        "q": "What inflation rate should I enter for my raise?",
        "a": "A common long-run US average is around 3%, but recent years have run higher, so use the figure that matches your period. For a raise covering one specific year, plug in that year's reported inflation rate. If you are unsure, run it twice, once at roughly 3% and once at a higher recent rate, and see whether your raise beats inflation under both."
      },
      {
        "q": "My raise was 3% but I feel poorer. Why?",
        "a": "If inflation over the same period was higher than 3%, your real raise is negative even though the dollar amount went up. That gap between a positive nominal raise and a negative real raise is exactly why paychecks can grow while your budget still feels tighter. Enter your numbers and a realistic inflation rate to see the real change percent and confirm whether your buying power actually fell."
      },
      {
        "q": "Can I use this for a multi-year pay comparison?",
        "a": "Yes. Enter the number of years between your old and new salary and the tool compounds the inflation rate across the whole period, so you can compare a salary from several years ago to today. This is useful for judging whether a series of small annual raises collectively kept pace with inflation, or quietly fell behind year after year."
      },
      {
        "q": "Is this the same as a salary vs inflation calculator?",
        "a": "Yes. This page is a salary-raise preset of the Inflation Calculator, set to Beat mode with Old salary and New salary labels, so it works as a salary-versus-inflation and real-raise calculator. Sibling presets handle related questions: the COLA page checks a cost-of-living adjustment, and the savings page shows how inflation erodes idle cash over time."
      }
    ],
    "howto": [
      "Select or confirm the tool is in \"Did it beat inflation?\" mode, with the fields labeled Old salary and New salary.",
      "Enter your Old salary (before the raise) and your New salary (after the raise) in the two amount fields.",
      "Enter the number of years between the two salaries and an annual inflation rate (around 3% is a typical long-run US average; use a higher recent figure if it fits your period).",
      "Read the results: nominal change percent (your raw raise), inflation over the period, the keep-pace salary you needed, and your real change percent with a plain verdict.",
      "Re-run with a lower and a higher inflation rate to see how sensitive your real raise is, since the figure is an estimate based on the rate you enter, not live CPI."
    ]
  },
  "inflation-calculator/rent": {
    "toolSlug": "inflation-calculator",
    "flagshipName": "Inflation Calculator",
    "flagshipUrl": "/finance/inflation-calculator",
    "flagshipDesc": "The full calculator — buying power and beat-inflation modes.",
    "clusterLabel": "inflation tools",
    "updated": "2026-09-07",
    "url": "/inflation-calculator/rent",
    "crumbName": "Rent vs Inflation",
    "toolProps": {
      "initialMode": "beat",
      "initialBeforeLabel": "Old rent ($)",
      "initialAfterLabel": "New rent ($)"
    },
    "siblings": [
      {
        "name": "Raise vs Inflation",
        "url": "/inflation-calculator/salary-raise"
      },
      {
        "name": "Savings & Inflation",
        "url": "/inflation-calculator/savings"
      },
      {
        "name": "COLA Calculator",
        "url": "/inflation-calculator/cola"
      }
    ],
    "h1": "Rent Increase vs Inflation Calculator",
    "seoTitle": "Rent Increase vs Inflation Calculator (Is It Fair?)",
    "metaDescription": "Compare your rent increase vs inflation free. Enter old and new rent to see if your hike beat inflation, by how much, and what a fair increase would be.",
    "lede": "Compare your rent increase vs inflation in seconds: enter your old rent, your new rent, the number of years between them, and an inflation rate, and see whether the hike is above or below inflation, by how much, and what a rent that just kept pace would have been.",
    "about": "Getting a renewal notice with a higher number on it raises one honest question: is this rent increase actually fair, or is my landlord raising it faster than everything else is going up? This page presets the Inflation Calculator to its 'Did it beat inflation?' mode with the two boxes labelled Old rent and New rent, so it answers exactly that. You type what you were paying, what you are being asked to pay, how many years apart the two figures are, and an inflation rate — and it separates the raw increase from the part that is just inflation, then tells you in plain words whether your rent outran inflation or stayed under it. A hike can look alarming in dollars and still be below inflation once you account for the years that passed, and this shows you which side of the line you land on.\\n\\nThe math behind a fair rent increase is simpler than it feels. If prices in general rose, say, 3% a year, then a rent that merely 'kept pace' with inflation would rise about 3% a year too — roughly 9.3% over three years once you compound it — and anything on top of that is a real increase, meaning your rent is claiming a bigger share of your budget than it used to. The tool does that compounding for you: it shows your nominal increase (the headline percentage), the inflation over the same period, the rent figure that would have just kept pace, and the real change — the gap between the two — so you can say concretely 'my rent went up 15% but inflation was only 9%, so it rose about 6% in real terms.' That real number is the one worth taking into a renewal conversation, because 'you're raising it well above inflation' is a far stronger position than 'it feels like a lot.'\\n\\nOne honest limit: you supply the inflation rate yourself — this tool does not pull live official CPI data, so every result is an estimate based on the rate you enter, not an official government figure. A long-run US average is around 3% a year, but rent-heavy recent years often ran higher, so it is worth trying a couple of rates (a conservative one and a recent-years one) to see a range rather than a single answer, and checking the actual CPI or a rent index for your area if you need a precise number. Everything runs in your browser with no sign-up and nothing uploaded. This is one preset of the same free Inflation Calculator — if you also want to check whether a pay bump kept up, the salary raise page uses the identical method on Old salary and New salary, and the buying-power savings page shows how idle cash loses value over time.",
    "faq": [
      {
        "q": "How do I compare my rent increase vs inflation?",
        "a": "Enter your old rent as the 'before' amount, your new rent as the 'after' amount, the number of years between them, and an inflation rate (a typical long-run US rate is about 3%, though recent years ran higher). The calculator shows your nominal increase, the inflation over the period, the rent that would have just kept pace, and the real change — so you can see whether the hike is above or below inflation and by how much."
      },
      {
        "q": "Is my rent increase fair or too high?",
        "a": "There is no legal 'fair' number, but comparing it to inflation gives a solid benchmark. If your increase is roughly equal to the inflation rate over the years involved, your landlord is broadly keeping pace with rising costs. If it is well above inflation, your rent is taking a bigger real share of your budget than before — the tool shows that gap as the 'real change' figure, which is the strongest single number to raise when you negotiate."
      },
      {
        "q": "What rent increase just keeps pace with inflation?",
        "a": "A rent that keeps pace rises by the inflation rate each year, compounded. At about 3% inflation that is roughly 3% for one year, about 6.1% over two years, and about 9.3% over three. The calculator computes the exact 'needed to keep pace' rent for your numbers, so you can compare it directly against what you are actually being asked to pay."
      },
      {
        "q": "Does this tool use official CPI or live inflation data?",
        "a": "No. You enter the inflation rate yourself, so the result is an estimate based on your figure, not an official CPI reading. That is deliberate — it lets you test a conservative rate and a recent higher rate to see a range. For a precise figure, check the current CPI or a local rent index and plug that rate in."
      },
      {
        "q": "What inflation rate should I use for a rent comparison?",
        "a": "For a long-run baseline, about 3% a year is a common US figure. But rent and housing costs often rose faster than the headline rate in recent years, so if you are comparing a recent increase, try a higher rate too — somewhere in the 4–6% range for the high-inflation stretch — and treat the two results as a low and high estimate rather than a single answer."
      },
      {
        "q": "Can I use this to negotiate my rent?",
        "a": "Yes — that is the main use. Walking into a renewal with 'my rent rose 15% but inflation over those years was about 9%, so it's up around 6% in real terms' is far more persuasive than saying it feels expensive. The tool gives you those exact numbers. It cannot tell you local vacancy rates or your legal rights, which also matter, but it grounds the conversation in a concrete real-terms figure."
      },
      {
        "q": "Is a rent increase below inflation actually a good deal?",
        "a": "In real terms, yes — if your rent rose less than inflation over the period, you are paying less of your real budget for housing than you were before, even though the dollar amount went up. The verdict line will say the increase stayed under inflation. It is still a nominal increase you have to pay, but relative to everything else getting more expensive, it is a below-market move."
      },
      {
        "q": "Is the rent inflation calculator free and private?",
        "a": "Yes. It is completely free with no account or sign-up, and it runs entirely in your browser — the rent figures you enter are never uploaded, logged or stored. It is one preset of the same Inflation Calculator that also powers the salary-raise and savings pages."
      }
    ],
    "howto": [
      "Enter your old rent (what you were paying before) in the 'before' box and your new rent (the renewal amount) in the 'after' box.",
      "Type the number of years between the two rents — usually 1 for an annual renewal, or more if you are comparing across a longer stay.",
      "Enter an inflation rate: about 3% for a long-run US estimate, or a higher recent-years rate — you supply this yourself, so the result is an estimate, not official CPI.",
      "Read the results: your nominal increase, the inflation over the period, the rent that would just keep pace, and the real change telling you if the hike beat inflation.",
      "Try a second, higher inflation rate to see a range, and use the real-change figure as your benchmark when deciding whether the increase is fair or worth negotiating."
    ]
  },
  "inflation-calculator/savings": {
    "toolSlug": "inflation-calculator",
    "flagshipName": "Inflation Calculator",
    "flagshipUrl": "/finance/inflation-calculator",
    "flagshipDesc": "The full calculator — buying power and beat-inflation modes.",
    "clusterLabel": "inflation tools",
    "updated": "2026-09-07",
    "url": "/inflation-calculator/savings",
    "crumbName": "Savings",
    "toolProps": {
      "initialMode": "buying"
    },
    "siblings": [
      {
        "name": "Raise vs Inflation",
        "url": "/inflation-calculator/salary-raise"
      },
      {
        "name": "Rent vs Inflation",
        "url": "/inflation-calculator/rent"
      },
      {
        "name": "COLA Calculator",
        "url": "/inflation-calculator/cola"
      }
    ],
    "h1": "What Is My Savings Worth After Inflation?",
    "seoTitle": "What Is My Savings Worth? Inflation on Savings Tool",
    "metaDescription": "What is my savings worth after inflation? Free calculator shows how idle cash loses buying power over the years. Enter your balance, a start and end year, and a rate.",
    "lede": "Wondering what your savings are really worth once inflation has chewed on them for a few years? This calculator answers exactly that. It runs in Buying power mode: enter the balance sitting in your account, the year you set it aside, a future year, and an average annual inflation rate you choose — and it shows the equivalent value that money represents by the end year, the total price change over the span, and the cumulative multiplier. The gap between that number and your untouched balance is the buying power inflation quietly takes. One honest caveat up front: you type in the inflation rate yourself, so the result is an estimate based on the rate you enter, not a live official CPI figure. Everything runs in your browser — no sign-up, nothing uploaded.",
    "about": "The thing that makes savings different from a salary or a rent bill is that idle cash does not move. If you park $10,000 in a plain account and never touch it, the statement still says $10,000 a decade later — the number is frozen, so it feels safe. Inflation attacks the other side of the equation: not the digits in your balance, but what those digits can buy. This page uses the Buying power mode to make that invisible loss visible. Enter your balance as the amount, the year you set it aside as the start year, and a future year as the end year, then choose a rate — a typical long-run US average is around 3%, though recent years ran hotter. The tool compounds that rate across the span and shows the equivalent value: how many dollars you would need in the end year to command the same buying power your balance had at the start. If $10,000 from 2015 shows an equivalent value of roughly $13,400 in 2025 at 3%, that is the plain warning — cash left alone would have needed to grow by a third just to stand still, and it did not.\n\nReading the result is where the real-versus-nominal distinction earns its keep. The nominal value of hoarded cash is fixed; its real value — its purchasing power — erodes every year the price level climbs. The total price change percent the tool reports is the size of that erosion over your whole period, and the cumulative multiplier is the same fact stated as a factor (a 1.34x multiplier means prices, and therefore the dollars needed to match them, rose 34%). Flip it around and the loss is even starker: if things cost 34% more, your frozen balance buys only about 1 ÷ 1.34 ≈ 75% of what it once did, so roughly a quarter of its power has silently drained away. This is the core reason a savings rate below inflation is a slow loss, not a gain: earning 1% in an account while prices rise 3% means your money grows in name but shrinks in what it can actually do, by about two points a year.\n\nA few honest limits so you use the number well. The calculator uses simple compound growth on the single rate you provide — it does not pull live CPI, it does not know your actual bank's interest, and it does not model taxes or a changing rate year to year. That makes it a clean what-if, not an official record: change the rate to 2%, 3%, and 5% and watch the erosion swing, which is a more useful habit than trusting one guess. If your goal is to check whether interest or returns you actually earned outran inflation rather than just projecting the loss on stagnant cash, the sibling Did-it-beat-inflation pages are built for that — see the salary-raise page for pay and the COLA page for a pension or Social Security adjustment. This savings page and those are all presets of the same free Inflation Calculator, each framed for a different money question.",
    "faq": [
      {
        "q": "What is my savings worth after inflation?",
        "a": "It depends on how long the cash sits and how fast prices rise. Put your balance in as the amount, the year you saved it as the start year, and a future year as the end year, then choose an inflation rate. The tool shows the equivalent value — how many end-year dollars you would need to match today's buying power — so the gap between that figure and your frozen balance is roughly what inflation costs you. Remember it is an estimate based on the rate you enter, not a live CPI reading."
      },
      {
        "q": "How does inflation erode idle cash savings?",
        "a": "Cash you leave untouched keeps the same nominal number forever, but the price of everything it might buy keeps climbing. So the balance stands still while the finish line moves away. At a 3% average rate, prices roughly double about every 24 years, which means money left as plain cash for that long buys about half of what it did. The calculator's total price change percent and cumulative multiplier put an exact size on that drain for your specific years and rate."
      },
      {
        "q": "Does this tool pull the real inflation rate for my savings?",
        "a": "No, and it is important to be clear about that. You type in the average annual inflation rate yourself, and the tool compounds it with simple growth. It does not fetch live official CPI data. That keeps it a fast what-if you fully control — try a few rates like 2%, 3%, and 5% to see a range — but it means the output is an estimate, not an official government figure. For historical accuracy to the exact dollar, a live-CPI source is the right reference."
      },
      {
        "q": "Why is my savings account losing to inflation?",
        "a": "Because most ordinary accounts pay less interest than prices are rising. If your account earns 1% but inflation runs 3%, your money grows in name yet loses about two percentage points of real buying power every year — a slow, quiet loss even though the balance ticks up. This Buying-power page shows the erosion on stagnant cash; to test whether a specific interest rate or return actually beat inflation, use the Did-it-beat-inflation salary-raise sibling page, which compares a before and after amount in real terms."
      },
      {
        "q": "What is the difference between the nominal and real value of savings?",
        "a": "Nominal value is the number on your statement — it does not change if you leave the cash alone. Real value is what that money can actually buy, and it falls as prices rise. This tool holds a lens to the real side: the equivalent value it reports is the nominal amount you would need later to preserve the same real buying power. When that figure climbs above your untouched balance, your real value has fallen even though the nominal number never moved."
      },
      {
        "q": "How many years does it take for savings to lose half its value?",
        "a": "Using the rule of 72, divide 72 by your inflation rate to estimate the years for prices to double — which is also roughly when idle cash buys half as much. At 3% that is about 24 years; at 6% it is about 12. Enter your own start and end years and rate to see the precise erosion, and read the cumulative multiplier: a 2.0x multiplier means prices doubled, so your frozen savings lost about half their buying power over that span."
      },
      {
        "q": "Should I keep large amounts of cash in savings then?",
        "a": "That is a personal decision and this tool is not financial advice — it only shows the math. What it makes clear is the trade-off: cash is liquid and safe in nominal terms, but a balance earning less than inflation loses real value every year it sits. Many people keep an emergency buffer in cash for exactly the liquidity and pair it with accounts or investments that at least aim to match inflation. Run your balance through the calculator to see the size of the erosion, then decide with real numbers in front of you."
      },
      {
        "q": "Is this the same as the other inflation calculator pages?",
        "a": "It is the same underlying free Inflation Calculator, preset to a different question. This savings page runs Buying power mode to show how idle cash erodes over years. The salary-raise, rent, and COLA sibling pages run Did-it-beat-inflation mode, comparing a before and after amount to judge whether a raise, a rent hike, or a cost-of-living adjustment kept pace in real terms. Same engine, same honest caveat that you supply the rate — just framed for whichever money decision you are weighing."
      }
    ],
    "howto": [
      "Make sure the tool is in Buying power mode, then enter your current savings balance as the amount.",
      "Set the start year to the year you set that money aside, and the end year to a future year you want to test — say ten or twenty years out.",
      "Enter an average annual inflation rate you choose; around 3% reflects the long-run US average, but try a few values since you are supplying the estimate, not pulling live CPI.",
      "Read the equivalent value — the dollars you would need in the end year to match today's buying power — alongside the total price change percent and the cumulative multiplier.",
      "Compare that equivalent value to your untouched balance: the difference is roughly the buying power inflation erodes, and re-running with a higher rate shows how much worse a hot inflation stretch would be."
    ]
  },
  "inflation-calculator/cola": {
    "toolSlug": "inflation-calculator",
    "flagshipName": "Inflation Calculator",
    "flagshipUrl": "/finance/inflation-calculator",
    "flagshipDesc": "The full calculator — buying power and beat-inflation modes.",
    "clusterLabel": "inflation tools",
    "updated": "2026-09-07",
    "url": "/inflation-calculator/cola",
    "crumbName": "COLA",
    "toolProps": {
      "initialMode": "beat",
      "initialBeforeLabel": "Before COLA ($)",
      "initialAfterLabel": "After COLA ($)"
    },
    "siblings": [
      {
        "name": "Raise vs Inflation",
        "url": "/inflation-calculator/salary-raise"
      },
      {
        "name": "Rent vs Inflation",
        "url": "/inflation-calculator/rent"
      },
      {
        "name": "Savings & Inflation",
        "url": "/inflation-calculator/savings"
      }
    ],
    "h1": "COLA Calculator: Did Your Cost-of-Living Adjustment Beat Inflation?",
    "seoTitle": "COLA Calculator: Did Your Raise Beat Inflation?",
    "metaDescription": "Free COLA calculator. Enter your before and after amounts and an inflation rate to see if your cost-of-living adjustment actually kept pace in real terms.",
    "lede": "This COLA calculator tells you whether your cost-of-living adjustment actually beat inflation or just looked like it did. Enter your Before COLA and After COLA amounts, the number of years the adjustment covers, and an inflation rate, and it shows the real change in buying power, not just the headline percentage.",
    "about": "A cost-of-living adjustment (COLA) is supposed to keep a pension, a Social Security benefit, or a salary from falling behind rising prices. But a COLA only protects you if the raise is at least as large as inflation over the same period. This page presets the Inflation Calculator to its \"Did it beat inflation?\" mode with the fields labeled Before COLA and After COLA, so you can check that in seconds. It calculates the nominal change (how much your check went up on paper), the inflation over the period, the amount you'd need just to keep pace, and the real change: whether your buying power actually rose, stayed flat, or quietly shrank.\n\nHere's the honest part, because it changes how you read the answer: you type in the inflation rate yourself. The tool does not pull the official CPI-W figure that Social Security uses, or any live government index. It runs simple compound growth on the rate you enter, so the result is an estimate that is exactly as good as your rate assumption. If you want to test against the real number, look up the CPI or CPI-W figure for your period and enter that. If you just want a gut check, a long-run US average of around 3% is a reasonable starting point, though several recent years ran well above that, which is exactly when COLAs tend to fall behind. Try a couple of rates and see how sensitive the verdict is.\n\nThis is one preset of everyboringtool.com's free Inflation Calculator, everything runs in your browser with no sign-up and nothing uploaded. If you're checking a workplace raise rather than a formal COLA, the sibling Salary Raise page frames the same math around old and new salary. And if you want to see how inflation eats idle money rather than a payment, the Savings page uses the buying-power mode to show what a balance is worth years later.",
    "faq": [
      {
        "q": "What does this COLA calculator actually tell me?",
        "a": "It compares your Before COLA and After COLA amounts against inflation over the same period and reports the real change in buying power. Instead of just showing that your check went up by some percentage, it shows whether that increase was bigger or smaller than inflation — so you learn whether the adjustment left you better off, flat, or quietly behind."
      },
      {
        "q": "Does this use the real Social Security COLA or official CPI data?",
        "a": "No. You enter the inflation rate yourself, and the tool applies simple compound growth to it. It does not pull the official CPI-W index that Social Security uses to set its annual COLA, nor any live government data. The result is an estimate based on your rate. To check against the real figure, look up the CPI or CPI-W change for your period and enter that number."
      },
      {
        "q": "How do I know if my COLA beat inflation?",
        "a": "Enter your before and after amounts, the number of years, and an inflation rate. If the real change % comes out positive, your COLA outpaced inflation and your buying power grew. If it's roughly zero, the adjustment just kept pace. If it's negative, prices rose faster than your raise and you lost ground in real terms even though the dollar amount went up."
      },
      {
        "q": "What rate should I enter for the inflation rate?",
        "a": "If you know the official CPI or CPI-W change over your COLA period, enter that for the most accurate comparison. If you're estimating, a long-run US average of around 3% is a common starting point, but note that several recent years ran higher — which is often when COLAs fall short. Try a few rates to see how much the verdict depends on your assumption."
      },
      {
        "q": "My Social Security check went up but everything still feels tight. Why?",
        "a": "That's the exact gap this tool exposes. A COLA can raise the dollar amount while inflation over the same window rises just as much or more, leaving your real buying power flat or lower. The 'amount needed to just keep pace' figure shows what your after amount would have to be to fully offset the inflation rate you entered — if your actual after amount is below it, the raise didn't fully cover rising prices."
      },
      {
        "q": "Can I use this for a pension or workplace cost-of-living raise, not just Social Security?",
        "a": "Yes. Any cost-of-living adjustment works — a pension COLA, a union or employer cost-of-living raise, or an annuity increase. Put the pre-adjustment amount in Before COLA and the post-adjustment amount in After COLA, set the years, and enter an inflation rate. The real change % answers the same question: did this adjustment actually preserve your buying power?"
      },
      {
        "q": "What's the difference between the nominal change and the real change?",
        "a": "The nominal change is the raise on paper — how much bigger your after amount is than your before amount, as a percentage. The real change subtracts inflation from that: it's what the raise is worth once you account for rising prices. A 5% nominal COLA against 6% inflation is a negative real change, meaning you can buy less than before despite a bigger check."
      },
      {
        "q": "Is this COLA calculator free and private?",
        "a": "Yes. It's part of everyboringtool.com's free Inflation Calculator, runs entirely in your browser, requires no sign-up, and uploads nothing — your amounts stay on your device. For related checks, the Salary Raise page applies the same real-vs-nominal math to a job raise, and the Savings page shows how inflation erodes cash you leave sitting."
      }
    ],
    "howto": [
      "Switch to (or confirm) the 'Did it beat inflation?' mode — this COLA page loads it preset, with the fields labeled Before COLA and After COLA.",
      "Enter your Before COLA amount (your monthly benefit, pension payment, or salary before the adjustment) and your After COLA amount.",
      "Enter the number of years the adjustment spans — 1 for a single annual COLA, or more if you're comparing across several years of adjustments.",
      "Enter an inflation rate for that period. Use the official CPI or CPI-W figure if you have it, or a long-run estimate like 3% — remember this is your input, not live CPI.",
      "Read the real change % and the plain verdict: a positive real change means your COLA beat inflation; near zero means it merely kept pace; negative means your buying power fell despite the raise."
    ]
  }
};

export const HIDDEN_TOOL_LANDING = new Set([]);
export function visibleToolLandingKeys() {
  return Object.keys(TOOL_LANDINGS).filter((k) => !HIDDEN_TOOL_LANDING.has(k));
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
