"use client";

import { useMemo, useState } from "react";

// Compact inline dictionary of common English words (3-8 letters).
// Stored as a whitespace-separated string to keep the source small.
const WORD_LIST = `
ace ache acid acre act acted actor acts add adds adept adit ado ads adult afar
afire afoot afraid after again age aged agent ages ago agree ahead aid aide
aids ail aim aims air aired airs aisle ajar akin alarm album alert algae alias
alibi alien align alike alive alley allot allow alloy ally almond almost aloe
aloft alone along aloof aloud alpha altar alter altos alum amaze amber amble
amend amid amigo amiss among ample amply amuse angel anger angle angry angst
anion ankle annex annoy annul anode anta ante anti ants anvil aorta apart apex
aphid apiece aplomb apnea apple apply april apron apse aqua arbor arc arch arcs
ardor area arena argon argue arid arise arm armed armor arms army aroma arose
array arrow arson art arts ascot ashen ashes aside ask asked asking asks aspen
aspic assay asset aster astir asylum ate atlas atoll atom atoms atone atop
attic audio audit auger aught augur aunt aunts aura aurae auras auto autos avail
avast avenue avert avian avid avow await awake award aware awash away awe awful
awoke axes axial axiom axis axle axles azure babble babe babel babes baby back
backs bacon bad bade badge badly bag bagel bags bail bait bake baked baker
bakes balance bald bale bales balk ball ballad ballet balloon balm balms bamboo
ban banal band bands bandy bane bang bangs banish bank banks banjo banks banns
bar bard bare barely barge bark barks barley barn barns baron barrel base based
basement bases basic basil basin basis basket bass baste bat batch bath bathe
baths baton bats batter battle bawl bay bayou bays beach bead beads beady beak
beam beams bean beans bear beard bears beast beat beaten beats beau beauty
beaver became because beckon become bed beds beech beef beefs been beep beer
beet beets beg began beggar begin begun behalf behave behind beige being belated
belfry belie belief belt belts bemoan bench bend bends beneath bent beret berry
berth beset beside best bestow bet beta bevel bevy beware bias bibs bicep biceps
bid bids big bigger bike biked bikes bile bill billion bin binary bind binder
binds bingo bins biped birch bird birds birth bison bit bite bites bits bitten
bitter blab black blade blame bland blank blare blast blaze bleach bleak bleat
bleed blend bless blew blimp blind blink bliss blithe bloat blob block bloke
blond blood bloom blot blouse blow blown blows blue bluer blues bluff blunt
blur blurb blurt blush board boar boars boast boat boats bob bobs body bog boil
boils bold bolt bolts bomb bombs bond bonds bone bones bong bongo bonus bony
boo book books boom boon boor boost boot booth boots booty booze border bore
bored bores born borne borrow bosom boss both bother bottle bottom bough
boulder bounce bound bounty bout bouts bovine bow bowed bowel bower bowl bowls
box boxed boxer boxes boy boys brace brag braid brain brake bran branch brand
brash brass brat brave bravo brawl bray bread break breast breath bred breed
breeze brew brews bribe brick bride brief brig bright brim brine bring brink
brisk broad broil broke broken bronco brood brook broom broth brow brown brows
bruise brunch brunt brush brute bubble buck bucket buckle bud budge budget buds
buff buffalo buffer buffet bug bugle bugs build built bulb bulbs bulge bulk
bull bully bump bumper bumps bunch bundle bung bunk bunny bunt buoy burden
bureau burger burial buried burlap burly burn burns burnt burp burrow burst
bury bus buses bush bushel bushy business bust busts busy but butane butch
butler butt butter button buy buyer buys buzz cab cabin cable cables cabs cache
cackle cacti cadet cadre cafe cage caged cages cajole cake caked cakes calf
call calls callus calm calmly calve came camel camera camp camps campus can
canal canary cancel cancer candid candle candy cane canes canine canned cannon
canoe canon cant canvas canyon cap cape caper capes capital captor car carat
carbon card cards care cared career cares caress cargo carol carp carpet carry
cars cart carton carts carve case cases cash cashew cask casket cast caste
castle casts casual cat catch cater cats cattle caught cause caused causes
caution cave caved caves cavil cavity cease cedar cede cell cellar cells cement
census cent center central cents cereal chafe chain chair chalet chalk champ
chance change chant chaos chap chapel char chard charge chariot charm chart
chase chasm chaste chat cheap cheat check cheek cheep cheer chef chess chest
chew chews chic chick chief child chill chime chimp chin china chink chip chips
chirp chisel chock choir choke chomp chop chops chord chore chose chosen chow
chrome chubby chuck chug chum chump chunk churn chute cider cigar cinch cinema
circle circus cite cited cites citric city civet civic civil clad claim clam
clamp clams clan clang clank clap clash clasp class clatter claus clause claw
claws clay clean clear cleat cleft clench clergy clerk clever click client
cliff climate climax climb clinch cling clinic clip clips cloak clock clod
clog clone close closed closer closet clot cloth clothe cloud clout clove clown
club clubs cluck clue clues clump clung clutch coach coal coals coarse coast
coat coats coax cob cobra cobweb cocoa cod code coded codes coerce coffee coffer
cog cogent coil coils coin coins coke cola cold colic collar college colon
colony color colt column coma comb combat combo combs come comedy comet comfort
comic coming comma command comment commit common commune commute compact company
compare compass compel compile complete comply compose compost compute comrade
concave conceal concept concern concert conch concur condemn condor conduct cone
cones confer confess confide confirm conform confuse congo conic conk connect
consent consist console consort consul consult contact contain content contest
context control convene convert convey convict convoy cook cooks cool cooler
coop coops coot cope coped copes copier copper copy coral cord cords core cored
cores cork corks corn corner corny corral corrupt corset cortex cosmic cost
costs cot couch cough could count counter county coup couple coupon courage
course court cousin cove cover covet covey cow coward cowboy cower cows coy
coyote cozy crab crack cradle craft crag cram cramp crane crank crash crate
crave crawl craze crazy creak cream crease create credit creed creek creep
crepe crept cress crest crew crib cried cries crime crimp crisp critic croak
crock crony crook croon crop crops cross crouch crow crowd crown crows crud
crude cruel cruet crumb crush crust crux cry crypt cub cube cubed cubes cubic
cubs cud cue cues cuff cuffs cull cult cup cupid cups curb curbs curd cure
cured cures curfew curio curl curls curly currant current curry curse cursor
curt curve curved cushion cusp custard custom cut cute cutlet cuts cyan cycle
cyclone cyclic cygnet cynic cyst czar dab dabble dad dads daffodil daft dagger
daily dairy dais daisy dally dam damage dame damn damp dampen damps dance
dancer dandy danger dank dare dared dares dark darken darkly darn dart dash
data date dated dates datum daub daunt dawdle dawn dawns day days daze dazed
dazzle dead deaf deal dealt dean dear death debar debate debit debris debt
debtor debug debut decade decal decay deceit decide decimal deck decks declare
decline decor decorate decoy decree deduce deduct deed deem deep deeper deeply
deer deface defame default defeat defect defend defense defer defiant deficit
define deflate deflect deform defraud defrost deft defuse defy degrade degree
deign deity delay delegate delete deli delta delude deluge deluxe delve demand
demean demise demo demon demote demure den denial denim dense dent dental
dented dents deny depart depend depict deplete deploy deport depose deposit
depot depress deprive depth deputy deride derive descend describe desert deserve
design desire desist desk desks despair despise despite dessert destiny detach
detail detain detect detente deter detour detract develop deviate device devil
devise devoid devote devour devout dew dhow diadem diagnose diagram dial dialog
diameter diamond diaper diary dice diced dictate diction did die died dies diet
differ dig digest digit dignity digs dike dilate dill dilute dim dime dimes
dimly dimple dine diner dines dingo dingy dinner dint diode dip diploma dips
dire direct dirge dirt dirty disable disarm disc discard disco discuss disdain
disease disgust dish disk disks dismal dismay dismiss disorder dispatch dispel
display dispute disrupt distance distant distinct distort disturb ditch dither
ditto ditty dive diver dives divert divest divide divine diving divorce divulge
dizzy dock docks doctor dodge doe does dog dogma dogs doily doing dole doll
dollar dolls dolphin dolt domain dome domes domino donate done dongle donkey
donor doodle doom door doors dope dork dorm dorsal dose dosed doses dot dote
dots double doubt dough dour dove dowager dowdy dowel down downs dowry doze
dozed dozen drab draft drag dragon drain drake drama drank drape draw drawer
drawl drawn draws dread dream dreamt dreary dredge dregs drench dress drew
dried drier dries drift drill drink drip drips drive drivel driven driver drone
drool droop drop drops dross drove drown drowsy drudge drug drugs drum drums
drunk dry dryer dual dub dubs duck ducks duct dud dude due duel duet duffel dug
duke dukes dull dully duly dumb dummy dump dumps dune dunes dung dungeon dunk
duo dupe duplex durable duration during dusk dust dusty duty dwarf dwell dwelt
dye dyed dyes dying dynamic dynamo dynasty each eager eagle ear earl early earn
earned earnest earns ears earth ease eased easel eases easily east easy eat
eaten eater eats eaves ebb ebbs ebony echo eclipse ecology economy ecstasy eddy
edge edged edges edging edible edict edifice edit edited editor edits educate
eel eels eerie efface effect efficient effort egg eggs ego egret eight either
eject elapse elastic elated elbow elder eldest elect element elegant elegy
elephant elevate eleven elf elicit elide elite elk elm elope eloquent else elude
elusive elves email embalm embargo embark embed ember emblem embody emboss
embrace emerald emerge emit empire employ empower empty emu enable enact enamel
encase enchant encircle enclose encode encore encroach end endanger endear
endeavor ended ending endless endorse endow endure enemy energy enforce engage
engine engrave engross engulf enhance enigma enjoy enlarge enlist enliven enmity
enorm enough enrage enrich enroll ensign enslave ensue ensure entail enter
entice entire entity entomb entrap entree entrust entry entwine envelop envoy
envy enzyme epic epoch epoxy equal equate equator equip equity era erase erased
eraser erect ermine erode erosion erotic err errand erratic error erupt escape
escort essay essence estate esteem etch eternal ether ethic ethnic etude
eucalyptus eulogy euro evacuate evade evaded evades evaluate evasion eve even
evening event ever every evict evil evince evoke evolve ewe exact exalt exam
example exceed excel except excerpt excess exchange excite exclaim exclude
excuse execute exempt exert exhale exhaust exhibit exhume exile exist exit
exodus exotic expand expanse expect expel expend expense expert expire explain
explode exploit explore export expose express expulse extend extent exterior
extol extort extra extract extreme extrude exude exult eye eyed eyes fable
fabric face faced faces facet facial facility fact factor facts fad fade faded
fades fads fail fails faint fair fairly fairy faith fake faked fakes falcon
fall fallen false falter fame famed familiar family famine famish famous fan
fancy fang fangs fanned far farce fare fared fares farm farms fast fasten faster
fat fatal fate fated fates father fathom fatigue fatten fatty faucet fault
fauna favor favorite fawn fax fear fears feast feat feats feather feature fed
federal fee feeble feed feeds feel feels feet feign feint feisty feline fell
fellow felon felony felt female fen fence fend fennel fern ferns ferret ferry
fervor fest fester festive fetch fete fetish fetter fetus feud feudal fever few
fez fiasco fib fiber fibs fickle fiction fiddle fidget field fiend fierce fiery
fife fifteen fifth fifty fig fight figment figs figure filbert filch file filed
files filet fill filled fillet film films filmy filter filth final finale
finance finch find finds fine fined finer fines finery finger finish finite fir
fire fired fires firm firms first fiscal fish fisher fist fists fit fits five
fix fixed fixes fizz fizzle flab flag flags flair flake flaky flame flank flap
flaps flare flash flask flat flats flatter flaunt flavor flaw flaws flax flea
fleck fled flee fleece fleet flesh flew flex flick flier flies flight flimsy
flinch fling flint flip flippy flirt float flock floe flog flood floor flop
flora floss flour flout flow flower flown flows flu flue fluff fluid fluke
flung flunk flush flute flutter flux fly flyer foal foam foams focal focus fodder
foe foes fog foggy foghorn foil foils foist fold folder folds foliage folk
follow folly foment fond fondle fondly font food fool fools foot for forage
foray forbid force forceps ford forearm forecast forego foreign foresee forest
forever forge forget forgive forgo fork forks forlorn form formal format former
forms formula forsake fort forte forth fortify fortune forty forum forward
fossil foster fought foul found fount four fourth fowl fox foxes foyer fracas
fraction fragile fragment frail frame franc frank frantic fraud fray frayed
freak free freed freely freeze freight french frenzy fresh fret friar friction
friday fridge fried friend fright frigid frill fringe frisk fritter frizz frock
frog frogs frolic from front frost froth frown froze frozen frugal fruit
frustrate fry fryer fudge fuel fulcrum fulfill full fully fumble fume fumes fun
function fund funds funeral fungus funk funnel funny fur furl furnace furnish
furrow furry further fury fuse fused fuses fusion fuss fussy futile future fuzz
fuzzy gab gable gadget gaffe gag gaily gain gains gait gala galaxy gale gall
gallon gallop gallows galore galoshes gambit gamble game games gamma gander gang
gap gape gaps garage garb garbage garden gargle garland garlic garment garner
garnet garnish garret garter gas gases gash gasket gasp gate gated gates gather
gauche gaudy gauge gaunt gauze gave gavel gawk gawky gay gaze gazed gazes gazelle
gazette gear gears gecko gel geld gem gems gender gene general generate generic
genes genial genie genius genre gent gentle gently genuine genus germ germs
gerund gesture get gets geyser ghastly ghetto ghost ghoul giant gibbon giblet
giddy gift gifts gig giga giggle gild gill gills gilt gimlet gimmick gin ginger
gingham ginseng giraffe gird girder girdle girl girls girth gist give given
gives gizmo glacier glad glade glamor glance gland glare glass glaze gleam glean
glee glen glib glide glimmer glimpse glint glisten glitch glitter gloat glob
globe gloom glorify glory gloss glove glow glucose glue glued glues glum glut
gluten gnarl gnash gnat gnaw gnome gnu goad goal goals goat goats gob goblet
goblin god gods goes goggle going gold golden golf gone gong good goods goofy
goose gopher gore gorge gorilla gory gosling gospel gossip got gouge gourd
gourmet gout govern gown gowns grab grace grade gradient grail grain gram
grammar grand granite grant granule grape graph grasp grass grate grave gravel
gravity gravy gray graze grease great grebe greed greek green greet grenade grew
grey grid gridiron grief grieve grill grim grime grimy grin grind grip gripe
grips grist grit gritty groan grocer groggy groin groom groove grope gross
grotto grouch ground group grouse grout grove grovel grow growl grown grows
growth grub grudge gruel gruff grumble grump grunt guard guava guess guest
guide guild guile guilt guise guitar gulf gull gullet gully gulp gum gumbo gums
gun gunner guns gurgle guru gush gushy gust gusto gusty gut guts gutter guy
guys guzzle gym gymnast gypsy gyrate habit hack hacks had hail hails hair hairy
hale half halibut hall hallow halls halo halt halter halve halves ham hamlet
hammer hammock hamper hams hamster hand handful handle handout hands handy hang
hangar hanger hangs hank hanker hansom happen happy harass harbor hard harden
hardly hardy hare harem hark harm harms harness harp harpoon harrow harry harsh
harvest has hash hassle haste hasten hasty hat hatch hate hated hates hatred
hats haughty haul hauls haunt have haven havoc hawk hawks hay haze hazel hazy
head heads heady heal heals health heap heaps hear heard hears heart heat heater
heath heave heaven heavy heck heckle hectic hedge hedron heed heel heels hefty
heifer height heir heist held helix hell hello helm helmet help helps hem
hemlock hemp hen hence henna hens herald herb herbs herd here heresy hermit
hero heron hers herself hertz hew hex hey hi hiccup hick hidden hide hideous
hides hiding high higher highly hijack hike hiked hikes hill hills hilly hilt
him hind hinder hindu hinge hint hints hip hippo hips hire hired hires hiss
history hit hitch hither hits hive hoard hoarse hoax hob hobble hobby hobo hock
hockey hoe hoes hog hogs hoist hold holds hole holes holiday hollow holly holster
holy homage home homer homes homing hominy honcho hone honest honey honk honor
hood hoods hoof hook hooks hoop hoops hoot hop hope hoped hopes hops horde
horizon hormone horn horns horror horse hose hosed hoses hospital host hostage
hostel hostile hostess hot hotel hound hour hours house hovel hover how howdy
however howl howls hub hubbub hubcap hubs hue hued hues huff hug huge hugs hulk
hull hulls hum human humane humble humbug humid humor hump humps humus hunch
hundred hung hunger hungry hunk hunks hunt hunter hunts hurdle hurl hurled
hurls hurrah hurry hurt hurts husband hush husk husky hustle hut hutch huts
hyacinth hybrid hydra hydrant hyena hymn hymns hype hyper hyphen ice iced ices
icicle icing icon icons icy idea ideal ideas idiom idiot idle idled idles idol
idols idyll if igloo igneous ignite ignore iguana ill illegal illicit image
imbibe imbue imitate immense immerse immoral immune imp impact impair impart
impasse impeach impede impel impend imperil impinge implant implore imply import
impose impound impress imprint improve impugn impulse impure impute inane inborn
inbred inbox incense incest inch inches incise incite include income incur
indeed indent index indices indict indigo indoor induce induct indulge industry
inept inert infamy infant infect infer inflame inflate inflict influx inform
infuse ingest ingot inhabit inhale inherit inhibit inject injure injury injustice
ink inkling inks inky inlaid inland inlay inlet inmate inn innate inner inning
inns input inquire inro insane inscribe insect insert inset inside insight
insipid insist insomnia inspect inspire install instant instead instep instill
instinct insular insulin insult insure intact intake integer intend intense
intent inter intercom interim interior intern into intone intrepid intrigue
introduce intrude intuit inundate invade invalid invent inverse invert invest
invite invoice invoke involve inward iodine ion ions iota irate ire iris irk
irks iron irony island isle isles isolate issue itch item items itself ivory
ivy jab jabber jack jackal jacket jacks jade jaded jaguar jail jails jalopy jam
jamb jams jangle janitor january jar jargon jars jasmine jaunt jaunty javelin
jaw jaws jay jays jazz jealous jean jeans jeep jeer jeers jell jelly jerk jerks
jerky jersey jest jester jet jets jetty jewel jibe jiff jiffy jig jiggle jigsaw
jilt jingle jinx job jobs jockey jocular jog jogs join joins joint joist joke
joked joker jokes jolly jolt jostle jot jots joule journal journey joust jovial
jowl joy joyful joyous joys jubilant judge judo jug jugs juice juicy jujube
juke julep july jumble jumbo jump jumper jumps junco junction juncture june
jungle junior juniper junk junket junta jupiter jurist juror jury just justice
justify jut jute juts kabob kale kangaroo kaput karat karate karma kayak kazoo
keel keels keen keep keeps keg kegs kelp kennel kept kernel kestrel ketch ketchup
kettle key keyboard keyhole keys khaki kick kicks kid kidnap kidney kids kill
kills kiln kilo kilt kimono kin kind kindle kindly king kingdom kings kink kinky
kinship kiosk kip kismet kiss kit kitchen kite kites kitten kitty kiwi knack
knapsack knave knead knee kneel knees knell knelt knew knife knight knit knives
knob knobs knock knoll knot knots know known knows knuckle koala kohlrabi kola
kook kopeck kosher kudos kudzu label labor lace laced laces lack lacks lacquer
lacy lad ladder laden ladle lads lady lag lager lagoon lags lain lair lairs lake
lakes lamb lambs lame lament lamp lamps lance land lands landscape lane lanes
language languid languish lanky lantern lap lapel lapse laptop laps larch lard
large larger largest lark larva laser lash lass lasso last latch late lately
latent later latex lather latitude latter lattice laud laugh launch launder
laundry laurel lava lavender lavish law lawful lawn lawns laws lawyer lax lay
layer layman layout laze lazy lea leach lead leader leads leaf leaflet league
leak leaks leaky lean leaned leans leap leaps learn leas lease leash least
leather leave leaves ledge ledger leech leek leeks leer leery leeway left leftover
leg legacy legal legend leggings legible legion legume legs leisure lemming
lemon lemur lend lends length lens lenses lent lentil leopard leper leprosy
lesion less lessen lesser lesson lest let lethal letter lettuce levee level lever
levy liable liaison liar liars libel liberal liberty library license lichen lick
licks licorice lid lids lie lied lief liege lien lies lieu life lifelong lift
lifts ligament light lightning like liked likely likens likes lilac lilt lily
limb limber limbo limbs lime limes limit limp limps line lined linen liner lines
linger lingo lining link links lint lion lioness lions lip lips liquid liquor
lira lisp list listen lists lit lite liter literacy literal lithe litter little
liturgy live lived lively liver lives lizard llama load loads loaf loam loan
loans loath loaves lob lobby lobe lobes lobster local locate lock locket locks
locus locust lodge loft lofty log logic login logo logs loin loins loiter loll
lone lonely long longer longs look looks loom looms loon loop loops loose loot
lop lope lopped lord lords lore lorry lose loser loses loss lost lot lotion lots
lotto lotus loud louder loudly lounge louse lousy lout love loved lovely lover
loves low lower lowly loyal lozenge lucid luck lucky lucre ludo lug luge lull
lullaby lumber lumen lump lumps lumpy lunar lunch lung lunge lungs lupine lurch
lure lured lures lurid lurk lush lust luster lusty lute luxury lye lying lymph
lynch lynx lyre lyric macaw mace machine macho macro mad madam made madly
madness magenta magic magma magnet magnify magnolia magpie maid maiden maids
mail mails maim main mainly maintain maize majesty major majority make maker
makes making malady malaise male malice malign mall mallard mallet malt mama
mammal mammoth man manage mane manes mange mango mangy mania manic manifest
manila mankind manner manor mansion mantel mantis mantle manual manure many map
maple maps mar marble march mare mares margin marigold marina marine marital
mark market marks marlin maroon marquee marred marrow marry marsh marshal mart
martial martin martyr marvel mascot mash mask masks mason masque mass massage
massive mast master mastiff mat match mate mated material maternal mates math
matinee matriarch matrix matron mats matt matter mattress mature maul mauve
maxim maximum may maybe mayhem mayor maze mazes me meadow meager meal meals mean
meander meaning means meant measure meat meats mecca mechanic medal meddle media
median mediate medic medical medium medley meek meet meets mega mellow melody
melon melt melts member membrane memento memo memoir memory men menace mend mends
menial mental mention menu mercury mercy mere merely merge merger merit mermaid
merry mesa mesh mess message met metal mete meteor meter method metric metro mew
mica mice microbe mid midday middle midge midget midi midnight midst midway
midwife might mighty migrate mild mildew mildly mile miler miles milieu military
militia milk milky mill miller million mills mime mimic mince mind minds mine
mined miner mineral mines mingle mini minimal minimum mink minnow minor mint
mints minus minute miracle mirage mire mirror mirth misdeed miser misery misfire
misfit mishap mislead mislaid misplace miss missile mission mist mistake misty
misuse mite miter mites mitt mitten mix mixed mixer mixes moan moans moat mob
mobile mobs mocha mock mocks modal mode model modem modern modest modify module
moist moisture molar molasses mold molds mole moles molest molt molten moment
mommy monarch monastery monday money mongoose mongrel monitor monk monkey mono
monsoon monster month mood moods moody moon moons moor moose moot mop mope moped
mops moral morale morass morbid more morgue morn morning moron morose morsel
mortal mortar mortgage mortify mosaic mosque moss mossy most motel moth mother
moths motif motion motive motley motor motto mound mount mourn mouse mousse
moustache mouth move moved moves movie mow mower mows much muck mucus mud muddle
muddy mudguard muff muffin muffle mug muggy mugs mulberry mulch mule mules mull
mullet multiply mum mumble mummy mumps munch mundane mural murder murk murky
murmur muscle muse mused museum mush mushroom mushy music musk musket muskrat
muslin mussel must mustang mustard muster musty mutant mute muted mutiny mutter
mutton mutual muzzle my myopia myriad myrrh myself mystery mystic mystify myth
nab nacho nadir nag nags nail nails naive naked name named names nap nape napkin
naps narrate narrow nasal nascent nasty natal nation native natural nature
naught nausea nautical naval nave navel navy nay near nearby nearly neat neatly
nebula neck necks nectar need needle needs needy negate neglect negotiate neigh
neither neon nephew nerve nervous nest nestle nests net nether nettle network
nets neural neuron neuter neutral never new newborn newel newer newly news newt
next nib nibble nice nicely nicer niche nick nickel nicks niece nifty niggle
nigh night nimble nine ninety ninja ninth nip nipple nips nit nitrogen no noble
nobody nocturne nod node nodes nods noel noise noisy nomad nominal nominate none
nonsense noodle nook noon noose nope nor norm normal north nose nosed noses nosy
not notable notch note noted notes nothing notice notify notion nougat noun
nourish novel novelty november novice now nowhere nozzle nuance nub nubs nuclear
nucleus nude nudge nugget nuisance null numb number numbers numeral numeric nun
nuns nurse nursed nursery nut nutmeg nuts nuzzle nylon nymph oaf oafs oak oaks
oar oars oases oasis oat oath oaths oats obese obey obeyed obeys obiter object
oblige oblique oblong obscene obscure observe obsess obsolete obstacle obtain
obtuse obvious occasion occult occupy occur ocean ocelot ocher octagon octane
octave october octopus ocular odd oddball odds ode odes odious odor odyssey of
off offbeat offend offer office officer offset often ogle ogre oh ohm oil oils
oily oink okay okra old older oldest olive omega omelet omen omens omit once one
onerous ongoing onion online onlooker only onset onto onus onward onyx ooze oozed
opal opaque open opened opener opening opera operate opine opinion opium opossum
oppose oppress opt optic optimal option opulent opus oracle oral orange orate
orbit orchard orchid ordain ordeal order ordinary ore oregano organ organic
orgy orient origin oriole ornate ornery orphan oscillate osier osmosis osprey
ossify ostrich other otter ouch ought ounce our ours ourself oust out outbid
outcast outcome outcry outdo outdoor outer outfit outing outlaw outlay outlet
outline outlive outlook output outrage outrun outset outside outward outwit oval
ovary oven ovens over overall overcast overcoat overcome overdo overdue overeat
overflow overhaul overhead overhear overlap overlay overload overlook overrule
overrun oversee overt overtake overtime overture overturn overuse owe owed owes
owing owl owls own owned owner owns ox oxbow oxen oxide oxygen oyster ozone pace
paced paces pacify pack packs pact pad paddle padlock pads pagan page paged
pages paid pail pails pain pains paint pair pairs pal palace palate pale paler
pallet pallid palm palms palsy pamper pamphlet pan panama pancake panda pander
pane panel panes pang pangs panic pans pansy pant panther pantry pants papa
papaya paper papers papyrus par parable parade paradox paragon parallel paramount
parboil parcel parch pardon pare pared pares parent parish parity park parka
parks parlor parody parole parrot parry parse parsley parsnip parson part partake
partial particle partisan partner parts party pass passage passe passenger passive
passport past pasta paste pastel pastime pastor pastry pasture pat patch pate
patent path pathos paths patient patio patriarch patriot patrol patron patter
pattern patty pauper pause paved paves paving paw pawn pawns paws pay payable
payload payment payroll pays pea peace peach peacock peak peaks peal peals
peanut pear pearl pears peas peasant peat pebble pecan peck pecks peculiar pedal
peddle pedigree peek peeks peel peels peep peer peers peeve peg pegs pelican
pellet pelt pelts pelvis pen penal penalty pence pencil pend pending pendulum
penguin penicillin peninsula penny pension pensive pent penury peon peony people
pep pepper per perceive perch percussion perennial perfect perfume perhaps peril
period perish perjure perk perks permanent permit peruse pervade pest pester
pesto pet petal petals peter petite petition petrol petty petunia pew pewter
pews phantom pharmacy phase phased phases pheasant phenomenon phial philosophy
phlox phobia phone phoned phones phony photo phrase physical physics pi piano
piazza pica pick picket pickle picks picnic pictures pie piece pier pierce pies
piety pig pigeon piglet pigment pigs pike pikes pilaf pile piled piles pilfer
pilgrim pill pillar pillow pills pilot pimple pin pinch pincushion pine pined
pines pinion pink pinkie pinnacle pinpoint pins pint pinto pints pinwheel pioneer
pious pip pipe piped pipes piping pippin pique piracy pirate pistachio pistil
pistol piston pit pitch pitcher pith pitiful pits pittance pity pivot pixel pixie
pizza placard place placebo placid plagiarize plague plaid plain plaintiff plait
plan plane planet plank plankton plans plant plaque plasma plaster plastic plate
plateau platform platinum platoon platter plausible play player playful plays
plaza plea plead pleasant please pleat pledge plenty plethora pliable pliers
plight plod plop plot plots plow plows ploy pluck plug plugs plum plumage plumb
plume plummet plump plums plunder plunge plural plus plush plywood poach pocket
pod podium pods poem poems poet poetic poetry poignant point poise poison poke
poked poker pokes polar pole poles police policy polio polish polite politic
polka poll pollen pollute polo polygon polymer pomp pompous pond ponder ponds
pony poodle pool pools poor poorly pop popcorn pope poplar poppy pops popular
porcelain porch porcupine pore pored pores pork porous porridge port portable
portal portend portent porter portion portly portrait portray pose posed poser
poses posh posit position positive posse possess possible post postage postal
poster postpone posts posture posy pot potato potent potion pots potter pottery
potty pouch poultry pounce pound pour pours pout poverty powder power practical
practice prairie praise prance prank pratfall prawn pray prayer preach precede
precept precinct precious precise predator predict preen preface prefer prefix
pregnant preheat prelude premier premise premium prepaid prepare preppy prescribe
present preserve preset preside press pressure prestige presume pretend pretext
pretty pretzel prevail prevent preview previous prey price pricey prick prickle
pride pried pries priest prim primal primary primate prime primer primp primrose
prince print printer prints prior prism prison privacy private privet prize prized
probe probed problem proceed process proclaim procure prod prodigy produce prof
profane profess profile profit profound profuse progeny program progress prohibit
project prologue prolong prom promenade prominent promise promote prompt prone
prong proof prop propel proper prophet propose propound props prose prosecute
prospect prosper protect protein protest proton protrude proud prove proverb
provide province provoke prow prowess prowl proxy prude prudent prune pry psalm
psyche pub public publish pucker pudding puddle pudgy puff puffin puffs puffy
pug pull pulls pulley pulp pulpit pulse pulses puma pump pumpkin pumps pun punch
punctual puncture pundit pungent punish punk punt puny pup pupa pupil puppet
puppy pups purchase pure puree purely purge purify purist puritan purity purl
purloin purple purport purpose purr purse pursue push pushes pushy puss put puts
putt putty puzzle pygmy pylon pyramid python quack quad quadrant quaff quail
quaint quake quaked quakes qualify quality qualm quandary quantity quarantine
quarrel quarry quart quarter quartz quash quaver quay queasy queen queer quell
quench query quest question queue quibble quiche quick quicken quid quiet quill
quilt quince quinine quintet quip quirk quit quite quiver quiz quorum quota
quotation quote quoted quotes rabbi rabbit rabble rabid raccoon race raced racer
races racial rack racket racoon racy radar radiant radiate radical radio radish
radius raffle raft rafter rafts rag rage raged rages ragged raggedy raglan rags
raid raids rail rails railway rain rains rainbow rainy raise rake raked rakes
rally ram ramble ramp rampant rampart rams ranch rancid rancor random rang range
rank rankle ranks ransack ransom rant rants rap rape rapid rapids rapport
rapture rare rarely rascal rash rasp raspberry raster rat ratchet rate rated
rates ratify ratio ration rational rats rattle raucous ravage rave raved raven
ravine raving ravioli raw ray rayon rays raze razor reach react read reader
reads ready real realign realism reality realize really realm reap reaps rear
rearm reason rebate rebel rebound rebuff rebuild rebuke rebut recall recede
receipt receive recent recess recipe recite reckon reclaim recline recluse
recoil recon record recount recoup recover recruit rectal rectangle rectify
rector red redden redeem redhead redo reduce reed reeds reef reefs reek reeks
reel reels refer referee refill refine reflect reflex reform refract refrain
refresh refuel refuge refund refuse refute regain regal regale regard regatta
regent reggae regime regiment region register regress regret regular regulate
rehab rehearse reign reimburse rein reindeer reins reinforce reject rejoice
rejoin relapse relate relax relay release relent relevant reliable relic relief
relieve religion relish relive rely remain remake remark remedy remember remind
remit remnant remodel remorse remote removal remove render rendezvous renew renown
rent rental rents renumber renunciation reopen reorder repaid repair repay repeal
repeat repel repent replace replay replica reply report repose repress reprint
reproach reprove reptile republic repulse reputation request require rerun rescue
research resemble resent reserve reservoir reset reside resign resin resist
resolve resonant resort resource respect respond response rest restaurant restful
restore restrain restrict result resume retail retain retake retard retch retina
retinue retire retort retract retreat retrieve retro return reunion reunite reuse
revamp reveal revel revenge revenue revere reverie reverse revert review revile
revise revive revoke revolt revolve reward rewind reword rework rewrite rhinoceros
rhombus rhubarb rhyme rhythm rib ribbon ribs rice rich riches richly rick rickety
rid riddle ride rider rides ridge ridicule riding rife riff riffle rifle rift
rig rigging right rigid rigor rigs rile rim rime rims rind ring rings rink rinse
riot rip ripe ripen ripest riposte ripple rips rise risen riser rises rising
risk risks risky risque rite rites ritual rival rivals river rivet roach road
roads roam roams roar roars roast rob robe robed robes robin robot robs robust
rock rocket rocks rocky rod rode rodent rodeo rods roe rogue roil role roles roll
rolls romaine roman romance romp romps rondo roof roofs rook rookie room rooms
roomy roost rooster root roots rope roped ropes rosary rose rosemary roses roster
rostrum rosy rot rotary rotate rote rotor rots rotten rotund rouge rough round
rouse roused rout route router routine rove rover roving row rowboat rowdy rows
royal rub rubber rubbish rubble rube rubric ruby ruckus rudder ruddy rude rudely
rueful ruff ruffle rug rugby rugged rugs ruin ruins rule ruled ruler rules rum
rumble ruminant rummage rumor rump rumple rumpus run rune rung rungs runner runt
runs runway rupee rupture rural ruse rush rushes rust rustic rustle rusts rusty
rut ruthless ruts rye sable sabotage sabre sac sachet sack sacks sacred sacrifice
sad saddle sadly sadness safari safe safely safer safety saffron sag saga sage
sago sags said sail sailor sails saint sake salad salami salary sale salient
saliva sallow salmon salon saloon salsa salt salts salty salute salvage salve
salvo same sample sanctify sanction sanctuary sand sandal sandbag sander sands
sandy sane sang sangria sanguine sanitary sanity sank sap sapling sapphire saps
sarcasm sardine sari sash sass sassy sat satchel sate sateen satin satire
satisfy saturate saturday satyr sauce saucer saucy sauna saunter sausage saute
savage savant save saved saver saves saving savior savor savory saw sawdust
sawn saws saxophone say saying says scab scabbard scad scaffold scald scale
scaled scales scallop scalp scaly scam scamper scampi scan scandal scanner scant
scapegoat scar scarce scare scared scarf scars scary scat scatter scavenge scene
scenery scenic scent scepter schedule scheme schnauzer scholar school schooner
science scissor scoff scold scone scoop scoot scooter scope scorch score scores
scorn scorpion scotch scoundrel scour scourge scout scowl scrabble scram scramble
scrap scrape scratch scrawl scrawny scream screech screen screw scribble scribe
scrimp script scroll scrooge scrounge scrub scruff scrum scruple scrutiny scuba
scud scuff scuffle scull sculpt sculpture scum scurry scuttle scythe sea seafood
seagull seal seals seam seaman seams seance search seas seaside season seat
seats seaweed secede seclude second secret sect section sector secular secure
sedan sedate sedative sediment seduce see seed seeds seedy seeing seek seeks
seem seems seen seep seeps seer seersucker sees seesaw seethe segment segregate
seismic seize seldom select selenium self selfish sell seller sells selves
semantic semaphore semester semi seminar senate send sends senile senior senor
sense sensible sensor sent sentence sentiment sentry sepal separate september
septic sequel sequin sequoia sera serene serf serge serial series serious sermon
serpent serrated serum servant serve served server serves service sesame session
set setback settee setter setting settle setup seven sever several severe sew
sewage sewer sewn sews sextant sextet shabby shack shackle shad shade shady shaft
shaggy shah shake shaken shaky shale shall shallow sham shame shampoo shamrock
shank shanty shape shaped shapes shard share shared shares shark sharks sharp
sharpen shatter shave shaved shaves shawl she sheaf shear sheath shed sheds
sheen sheep sheer sheet sheik shelf shell shellac shells shelter shelve sheriff
sherry shield shift shill shim shimmer shin shine shined shines shingle shiny
ship shipment ships shire shirk shirt shiver shoal shock shocks shod shoddy shoe
shoes shone shook shoot shop shops shore shored shores shorn short shorts shot
shots should shoulder shout shove shovel show showcase shower shown shows shrank
shred shrew shrewd shriek shrill shrimp shrine shrink shrivel shroud shrub shrug
shuck shudder shuffle shun shunt shush shut shutter shuttle shy shyly sibling
sick sicken sickle sickly side sided sides siege sierra siesta sieve sift sifts
sigh sighs sight sigma sign signal signature signet significant signify signs
silent silica silk silken silky sill silly silo silt silver similar simmer simper
simple simplify simply simulate sin since sincere sinew sinful sing singe singer
single sings sinister sink sinks sinner sinus sip siphon sips sir sire sired
siren sirloin sirup sis sissy sister sit site sited sites sits sitter situate
situation six sixteen sixth sixty sizable size sized sizes sizzle skate skated
skater skein skeleton skeptic sketch skew skewer ski skid skids skiff skill
skilled skillet skills skim skimp skin skinny skins skip skips skipper skirmish
skirt skit skittish skulk skull skunk sky slab slack slag slain slake slalom
slam slander slang slant slap slaps slash slat slate slather slaughter slave
slavery slaw slay slays sled sleds sleek sleep sleepy sleet sleeve sleigh
slender slept sleuth slew slice slick slid slide slight slim slime slimy sling
slink slip slippage slips slit slither sliver slob slobber slog slogan sloop
slop slope slops sloppy slosh slot sloth slots slouch slough slovenly slow
slower slowly slug sluggard sluggish sluice slum slumber slump slums slung slur
slurp slush sly slyly smack small smaller smart smash smear smell smelly smelt
smidge smile smiled smiles smirk smite smith smitten smock smog smoke smoked
smokes smoky smolder smooch smooth smote smother smudge smug smuggle snack snacks
snag snail snails snake snakes snap snapper snaps snare snark snarl snatch snazzy
sneak sneaker sneer sneeze snicker snide sniff snifter snip snipe snippet snitch
snivel snob snoop snooze snore snored snores snorkel snort snot snout snow snowy
snub snuff snug snuggle so soak soaks soap soaps soapy soar soars sob sober sobs
soccer sociable social society sock socket socks soda sodden sofa soft soften
softly softwood soggy soil soils solace solar sold solder soldier sole soled
soles solemn solicit solid solitary solo solstice soluble solution solve solvent
somber some somebody someday somehow someone something sometime somewhat somewhere
son sonar sonata song songs sonic sonnet sons soon soot soothe sooty sop sophist
sophomore soprano sorbet sorcery sordid sore sorely sores sorority sorrel
sorrow sorry sort sorts sought soul souls sound soundly soup soups sour source
sours souse south souvenir sovereign sow sowed sown sows soy soybean spa space
spaced spaces spade spam span spandex spangle spaniel spank spans spar spare
spared spark sparkle sparks sparrow sparse spasm spat spate spatter spatula
spawn spay speak speaks spear special species specific specify specimen speck
speckle specs spectacle spectator specter spectrum speculate sped speech speed
speedy spell spelling spells spend spent sperm spew sphere sphinx spice spicy
spider spied spies spigot spike spiked spikes spill spin spinach spinal spindle
spine spinet spinning spins spiral spire spirit spit spite spitfire spits splash
splat splatter spleen splendid splice splint splinter split splotch splurge
splutter spoil spoils spoke spoken spokes sponge sponsor spontaneous spoof spook
spooky spool spoon spoor sport sports spot spots spotty spouse spout sprain
sprang sprawl spray spread spree sprig spring sprinkle sprint sprite sprocket
sprout spruce sprung spry spud spume spun spunk spur spurn spurs spurt sputter
spy squabble squad squadron squalid squall squalor squander square squash squat
squawk squeak squeal squeamish squeeze squelch squid squint squire squirm squirrel
squirt stab stable stack stacks stadium staff stag stage staged stages stagger
stagnant staid stain stair stairs stake staked stakes stale stalk stalks stall
stallion stamen stamina stammer stamp stampede stamps stance stanch stand
standard stands stank stanza staple star starch stardom stare stared stares
starfish stark starling starry stars start starts startle starve stash state
stated states static station stature status statute staunch stave stay stays
stead steady steak steal steam steamer steed steel steely steep steeple steer
steers stein stellar stem stems stench stencil step steppe steps stereo sterile
stern steroid stew steward stews stick sticks sticky stiff stiffen stifle stigma
stile still stilt stimulate sting stingy stink stint stipend stipple stir stirs
stirrup stitch stoat stock stocks stodgy stogie stoic stoke stoked stole stolen
stomach stomp stone stoned stones stony stood stool stoop stop stops stopper
storage store stored stores stork storm storms stormy story stout stove stow
stowaway straddle straggle straight strain strait strand strange strangle strap
strategy stratum straw strawberry stray streak stream streamer street strength
strenuous stress stretch strew strewn stricken strict stride strident strife
strike string strip stripe strive strode stroke stroll strong strontium strop
strove struck structure strudel struggle strum strung strut stub stubble stubborn
stucco stuck stud student studio study stuff stuffing stuffy stumble stump stumps
stun stung stunk stunt stupid stupor sturdy stutter sty style stylish stylus
stymie suave sub subdue subject sublet sublime submarine submit subordinate
subplot subscribe subside subsidy subsist substance subtitle subtle subtly
subtract suburb subvert subway succeed success succinct succor succulent succumb
such suck sucker suckle sudden suds sue sued suede sues suet suffer suffice
suffix suffocate sugar suggest suicide suit suite suitor suits sulfur sulk sulky
sullen sultan sultry sum sumac summary summer summit summon sump sumptuous sums
sun sundae sunday sundry sunflower sung sunk sunken sunny sunrise sunset sunshine
suntan sup super superb superior supermarket supersede supervise supper supple
supplant supply support suppose suppress supreme sure surely surf surface surfeit
surge surged surges surgeon surgery surly surmise surmount surname surpass surplus
surprise surreal surrender surround survey survive suspect suspend suspense
sustain sutra suture swab swaddle swag swagger swallow swam swamp swan swank swans
swap swarm swarthy swat swatch swath swathe sway swear sweat sweater sweep sweeper
sweet sweeten swell swelter swept swerve swift swig swill swim swims swindle swine
swing swipe swirl swish switch swivel swollen swoon swoop swop sword swore sworn
swum swung sycamore syllable syllabus symbol symmetry sympathy symphony symptom
synagogue sync syncopate syndicate syndrome synergy synod synonym synopsis
syntax synthesis syringe syrup system tab tabby table tablet taboo tabs tabu
tacit taciturn tack tackle tacks tacky taco tact tactful tactic tad tadpole
taffeta taffy tag tags tail tailor tails taint take taken takeoff taker takes
talcum tale talent tales talisman talk talker talks tall taller tallow tally
talon tamale tambourine tame tamed tamer tamp tampon tan tandem tang tangelo
tangent tangerine tangible tangle tango tangy tank tanker tanks tanned tanner
tannery tansy tantalize tantrum tap tape taped taper tapes tapestry tapioca
tapir taproom taps tar tardy tare target tariff tarnish taro tarot tarp tarpaulin
tarry tart tartan tarts task tassel taste tasted tastes tasty tat tatter tattle
tattoo taught taunt taupe taut tavern tawdry tawny tax taxes taxi tea teach
teacher teak teal team teams teapot tear tears tease teat tech technical
technique tedious tee teem teems teen teens teeny teeter teeth telegram telegraph
telepathy telephone telescope televise tell teller tells temper tempest template
temple tempo tempt ten tenacity tenant tend tender tendon tendril tenet tennis
tenon tenor tense tension tent tentacle tenth tents tenuous tenure tepee tepid
tequila term terminal termite terms tern terrace terrain terrapin terrestrial
terrible terrier terrific terrify territory terror terse test testament testify
testimony tests tetanus tether text textile texts texture than thank thanks
thankful that thatch thaw thaws the theater theft their theirs them theme themselves
then thence theology theorem theory therapy there thereby therefore thermal
thermos these thesis they thick thicken thicket thief thigh thimble thin thine
thing things think thinks thinly third thirst thirsty thirteen thirty this
thistle thong thorax thorn thorns thorough those thou though thought thousand
thrash thread threat three thresh threw thrift thrill thrive throat throb throes
throne throng throttle through throw thrown throws thrush thrust thud thug thumb
thump thunder thursday thus thwart thyme thyroid tiara tibia tic tick ticket
tickle tics tidal tidbit tide tided tides tidings tidy tie tied tier ties tiff
tiger tight tighten tigress tile tiled tiles till tiller tilt tilts timber time
timed timeline timer times timid timing timpani tin tinder tine tinfoil tinge
tingle tinker tinkle tinny tinsel tint tints tiny tip tipped tips tipsy tiptoe
tirade tire tired tires tissue titan tithe title titled titter tizzy toad toast
tobacco today toddle toddler toe toed toes toffee tofu toga together toggle toil
toilet toils token told tolerant tolerate toll tolls tom tomahawk tomato tomb
tomboy tombstone tome tomorrow ton tone toned tones tongs tongue tonic tonight
tonnage tons tonsil too took tool tools toon toot tooth top topaz topcoat topic
topple tops torch tore torment tornado torpedo torpid torque torrent torrid
torso tort torte tortilla tortoise torture toss tossed total totem totter toucan
touch tough toughen toupee tour tourist tournament tousle tout tow toward towel
tower town towns township tows tox toxic toxin toy toyed toys trace traced traces
track tracks tract traction tractor trade trader trades tradition traffic tragedy
tragic trail trailer trails train trainer trains trait traitor trajectory tram
tramp trample trance tranquil transact transcend transcribe transfer transform
transfusion transgress transient transit translate transmit transom transparent
transpire transplant transport trap trapeze trapper traps trash traumatic travail
travel traverse travesty trawl tray treacherous tread treason treasure treat
treaties treatment treaty treble tree trees trek trellis tremble tremor tremulous
trench trend trepidation trespass trestle triad trial triangle tribal tribe
tribunal tribute triceps trick trickle tricks tricky tricycle trident tried
trifle trigger trill trillion trilogy trim trimmed trinket trio trip tripe triple
tripod tripe trite triumph trivet trivia trod troll trolley trombone troop trooper
trophy tropic trot trots trouble trough troupe trousers trout trowel truant truce
truck trucks trudge true truffle truly trump trumpet truncate trundle trunk truss
trust trustee truth try tsar tub tuba tube tuber tubes tubs tuck tudor tuesday
tuft tug tugboat tugs tulip tumble tumbler tummy tumor tumult tuna tundra tune
tuned tuner tunes tunic tunnel turban turbine turbo turf turkey turmoil turn
turner turnip turns turnstile turpentine turquoise turret turtle tusk tussle
tutor tutu tuxedo twang tweak tweed tweet tweezers twelve twenty twerp twice
twig twigs twilight twill twin twine twinge twinkle twins twirl twist twister
twit twitch two tycoon tying type typed types typhoon typical typify typist
typo tyranny tyrant udder ugly ukulele ulcer ulterior ultimate umber umbilical
umbra umbrage umbrella umpire unable unaware unbend unborn unbroken uncanny
uncertain uncle unclear uncoil uncommon uncouth uncover under undergo underline
undermine underneath understand undertake underwear undo undue undulate unearth
uneasy uneven unfair unfit unfold unfurl ungainly unhappy unhook unicorn uniform
unify unilateral union unique unison unit unite unity universal universe unjust
unkempt unkind unknown unlace unlatch unless unlike unload unlock unlucky unmask
unpack unravel unreal unrest unroll unruly unsafe unscrew unseat unseen unsound
untidy untie until untold untrue untwist unused unusual unveil unwind unwise
unwrap up upbeat upbraid upcoming update upend upgrade upheaval uphill uphold
upholster upkeep upland uplift upload upon upper upright uprising uproar uproot
upscale upset upshot upside upstairs upstart upstream uptake uptight uptown
upturn upward uranium urban urbane urchin urge urged urgent urges urn urns us
usable usage use used useful useless user uses usher usual usurp usury utensil
uterus utility utmost utopia utter utterly vacancy vacant vacate vacation vaccine
vacuum vagabond vagrant vague vaguely vain valance vale valet valiant valid
valise valley valor valuable value valued values valve vamp vampire van vandal
vane vanilla vanish vanity vanquish vantage vapid vapor variable variety various
varnish vary vase vassal vast vat vats vault vaunt veal veer veered veers veg
vegan vegetable vehement vehicle veil veiled veils vein veins velcro veld vellum
velocity velour velvet vend vendor veneer venerate vengeance venison venom vent
ventilate venture venue veracity veranda verb verbal verbose verdant verdict
verge verify veritable vermin vernacular versatile verse versed version versus
vertebra vertex vertical vertigo verve very vessel vest vestige vestment vests
vet veto vex via viable viaduct vial vibrant vibrate vicar vice vicinity vicious
victim victor victory video vie vied vies view viewer views vigil vigilant
vignette vigor viking vile vilify villa village villain vindicate vine vinegar
vines vineyard vintage vinyl viola violate violence violet violin viper virago
viral virgin virile virtual virtue virulent virus visa visage viscera viscous
vise visible vision visit visitor visor vista visual vital vitality vitamin
vivacious vivid vixen vizier vocabulary vocal vocation vociferous vodka vogue
voice voiced voices void volatile volcano vole volley volleyball volt voltage
volume voluntary vomit voracious vortex vote voted voter votes vouch voucher vow
vowel vows voyage vulgar vulnerable vulture wacky wad waddle wade waded wader
wades wadi wafer waffle waft wag wage waged wager wages waggle wagon wags waif
wail wails waist wait waiter waits waive wake waked waken wakes walk walker walks
wall wallaby wallet wallop wallow walls walnut walrus waltz wan wand wander wane
waned wanes wangle want wanton wants war warble ward warden wardrobe ware wares
warfare warily warm warmer warmly warmth warn warns warp warpath warrant warren
warrior wars wart warts wary was wash washer washes wasp wasps waste watch water
waters watt wattage wattle wave waved waver waves wavy wax waxed waxen waxes way
ways wayside wayward we weak weaken weakly weal wealth wean weapon wear weary
weasel weather weave web webbing weber webs wed wedding wedge wedlock wednesday
weds wee weed weeds week weekend weekly weeks weep weeps weevil weigh weight
weird welcome weld welfare well wells welsh welt wench wend went wept were west
western wet wetland wets whack whale whales wharf what wheat wheedle wheel wheels
wheeze when whence whenever where whereas wherever whet whether whey which whiff
while whim whimper whine whined whinny whip whipped whir whirl whisk whisker
whiskey whisper whistle white whiten whittle whiz who whoa whoever whole wholly
whom whoop whopper whose why wick wicked wicker wicket wide widely widen wider
widget widow width wield wife wig wiggle wight wigs wigwam wild wildcat wilder
wildlife wile wiles will willful willing willow wills wilt wily wimp win wince
winch wind window windows windy wine wines wing wings wink winks winner winning
wins winsome winter wipe wiped wiper wipes wire wired wires wiring wiry wisdom
wise wisely wiser wish wishes wisp wispy wisteria wistful wit witch with withdraw
wither withhold within without withstand witless witness wits witty wives wizard
wobble woe woeful woes wok woke woken wolf wolves woman womb women won wonder
wondrous wont woo wood wooden woods woody wooed woof wool woozy word words work
worker works workshop world worm worms worn worry worse worship worst worth
worthy would wound wove woven wow wrack wraith wrangle wrap wraps wrath wreak
wreath wreck wren wrench wrest wrestle wretch wriggle wring wrinkle wrist writ
write writer writes writhe writing written wrong wrote wrought wrung wry yacht
yak yam yams yank yanks yap yaps yard yards yardstick yarn yarns yawn yawns ye
yea yeah year yearly yearn yearns years yeast yell yellow yells yelp yelps yen
yes yeti yew yield yields yodel yoga yogurt yoke yoked yokes yolk yon yonder you
young younger your yours yourself youth youthful yowl yoyo yucca yule yum yummy
zany zap zaps zeal zealot zealous zebra zenith zephyr zero zest zestful zeta
zigzag zilch zinc zing zip zipper zips zircon zit zither zodiac zombie zone zoned
zones zonk zoo zoom zooms zoos zucchini
`.trim().split(/\s+/);

// Build a letter-count map (Map of char -> count).
function countLetters(str) {
  const counts = {};
  for (const ch of str) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

// Precompute per-word letter counts once (module scope, runs a single time).
const WORD_ENTRIES = (() => {
  const seen = new Set();
  const entries = [];
  for (const w of WORD_LIST) {
    if (!w || w.length < 3 || w.length > 8) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    entries.push({ word: w, counts: countLetters(w) });
  }
  return entries;
})();

function canBuild(wordCounts, availableCounts) {
  for (const ch in wordCounts) {
    if ((availableCounts[ch] || 0) < wordCounts[ch]) return false;
  }
  return true;
}

export default function WordUnscrambler() {
  const [letters, setLetters] = useState("");

  const cleaned = useMemo(
    () => (letters || "").toLowerCase().replace(/[^a-z]/g, ""),
    [letters]
  );

  const { groups, total, longest } = useMemo(() => {
    if (!cleaned) {
      return { groups: [], total: 0, longest: 0 };
    }
    const available = countLetters(cleaned);
    const matches = [];
    for (const entry of WORD_ENTRIES) {
      if (entry.word.length > cleaned.length) continue;
      if (canBuild(entry.counts, available)) matches.push(entry.word);
    }
    // Sort: longest first, then alphabetical.
    matches.sort((a, b) => (b.length - a.length) || a.localeCompare(b));

    const byLength = new Map();
    for (const w of matches) {
      if (!byLength.has(w.length)) byLength.set(w.length, []);
      byLength.get(w.length).push(w);
    }
    const grouped = Array.from(byLength.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([len, words]) => ({ len, words }));

    return {
      groups: grouped,
      total: matches.length,
      longest: grouped.length ? grouped[0].len : 0,
    };
  }, [cleaned]);

  const hasInput = cleaned.length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wu-letters">
              Your letters
            </label>
            <input
              id="wu-letters"
              className="tool-input"
              type="text"
              value={letters}
              onChange={(e) => setLetters(e.target.value)}
              placeholder="e.g. tradseo"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
            />
            <p className="tool-note">
              Enter up to 40 letters. We only use A-Z; spaces, numbers and
              symbols are ignored. Each letter is used no more than the number
              of times you provide it.
            </p>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn"
          onClick={() => setLetters("")}
          disabled={!letters}
        >
          Clear
        </button>
      </div>

      {hasInput && (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{total}</div>
            <div className="tool-stat-label">Words found</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{cleaned.length}</div>
            <div className="tool-stat-label">Letters available</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{longest || 0}</div>
            <div className="tool-stat-label">Longest word</div>
          </div>
        </div>
      )}

      {!hasInput && (
        <p className="tool-note">
          Type your scrambled or leftover letters above to see every word from
          our ~1,500-word common English list that you can spell.
        </p>
      )}

      {hasInput && total === 0 && (
        <div className="tool-error">
          No words from the list can be made with those letters. Try adding a
          vowel or a few more letters.
        </div>
      )}

      {hasInput &&
        groups.map((group) => (
          <div key={group.len} className="tool-result">
            <div className="tool-result-label">
              {group.len} letters ({group.words.length})
            </div>
            <div className="tool-result-value">
              <div className="tool-output">{group.words.join("  ")}</div>
            </div>
          </div>
        ))}
    </div>
  );
}
