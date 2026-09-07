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
