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
  }
};

// Reserved for future per-page gating (e.g. hide until approval). Empty for now.
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
