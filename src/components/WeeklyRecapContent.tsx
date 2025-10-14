// Weekly Recap Content - Dynamically loaded based on week
export interface WeeklyRecapContentProps {
  week: number
}

export function getWeeklyRecapContent(week: number): {
  title: string
  subtitle: string
  paragraphs: Array<{
    type: 'text' | 'alert' | 'success' | 'warning' | 'info'
    heading?: string
    content: string | string[]
  }>
} {
  const content: Record<number, ReturnType<typeof getWeeklyRecapContent>> = {
    5: {
      title: "Week 5: Chaos, Upsets & Graveyard Vibes",
      subtitle: "Week 5 brought more chaos than a Monday night tailgate",
      paragraphs: [
        {
          type: 'text',
          content: "Week 5 of the NFL season brought more chaos than a Monday night tailgate, and our survivor pool took a brutal hit. With a 47% win rate, losses, and two no-shows, the graveyard's getting crowded. Let's break down the carnage with a little sass and a lot of stats—because this pool's a battlefield, and some of y'all just got smoked!"
        },
        {
          type: 'alert',
          heading: '💀 The Fallen Four: RIP to These Picks',
          content: [
            'Week 5 was a grim reaper\'s delight, claiming four players in one fell swoop. Pour one out for:',
            'Cowboyup (Dan Evans): Thought the Seahawks would soar. Nope! They crashed hard, leaving Dan\'s survivor dreams in the Pacific Northwest fog. Adios, cowboy.',
            'Timodore (Osprey): Also hitched his wagon to Seattle\'s sinking ship. When the Hawks tanked, so did Osprey\'s chances. Fly away, birdie, straight to the cemetery.',
            'Hayden (Hayden Gaussoin): Bet on the Bills to buffalo their way past the Patriots. Plot twist: New England pulled a 23-20 upset, sending Hayden to the gravestone gang. Ouch, rookie.',
            'Kyler Stroud: Yo, Kyler, where you at? No pick = auto-elimination. With one life left, you ghosted us and joined the fallen. Gotta show up to survive, man!'
          ]
        },
        {
          type: 'warning',
          heading: '⚠️ Life Losses: The Bubble Gets Shakier',
          content: [
            'Eight players felt the Week 5 heat, dropping to one life. Y\'all are one bad pick from the graveyard, so step up your game:',
            'RazG, Jonathan (JSizzle), Josh: All three banked on the Cardinals, but Arizona got grounded. One life left—don\'t let those wings get clipped again!',
            'Jordan Petrusich: Rams let you down, leaving you clinging to a single life. Better pick smarter, or you\'re joining the eliminated crew.',
            'Jaren Petrusich: Giants fumbled your hopes. One life to go, Jaren—make it count!',
            'Dustin Dimicelli, Rolyat Toor (Taylor Root): Bills\' upset loss to the Pats stung you both. One life remaining, so don\'t bet on another Buffalo blunder.',
            'Keegan McAdam: No pick, Keegan? That\'s a free strike! Down to one life—get in the game or get a gravestone.'
          ]
        }
      ]
    },
    6: {
      title: "Packers Parade Saves the Day, But Keegan's Heartbreak Steals the Show! 😢🏈",
      subtitle: "Week 6: 94% Survival? Packers Party! (But Oof, Keegan... One Point?!)",
      paragraphs: [
        {
          type: 'text',
          content: "Week 6 was like that rom-com where everyone gets a plot twist—mostly happy endings, but one gut-punch that leaves you ugly-crying into your nachos. With a stellar 94.1% success rate and perfect participation (shoutout to all 17 of you for showing up!), our pool dodged a massacre. But hold the confetti: One heartbreaking loss means we're down to 16 warriors, and 11 of 'em are sweating bullets on their last life. It's like The Hunger Games meets Survivor—except with more cheeseheads celebrating. Let's unpack the glory, the gore, and the NFL's wild side with some sass, stats, and a dash of pop culture flair."
        },
        {
          type: 'alert',
          heading: '💀 The Sole Survivor Slaughter: RIP Keegan McAdam',
          content: [
            'In a week of near-perfection, Keegan McAdam became the tragic hero nobody asked for. Y\'all, this man picked the Washington Commanders—and they almost pulled it off! A nail-biting Bears 25 @ Commanders 24 loss by one single point on Monday Night Football? That\'s not a defeat; that\'s the football gods trolling him harder than a Marvel plot twist where the hero gets Thanos-snapped at 99% health.',
            'Keegan went from one life to zero faster than you can say "Hail Mary regret." If this were The Office, you\'d be the Jim Halpert of picks—endearing, but doomed by a Dwight-sized upset.',
            'Your gravestone\'s up in the cemetery section now, complete with a RIP popup that\'ll haunt our league page like a bad ex at a wedding. We salute you... from a safe, still-alive distance. Pool\'s now at 9 eliminated total—join the club with Kevyn, CoDore, and the Week 5 crew. No hard feelings; just hard lessons.'
          ]
        },
        {
          type: 'success',
          heading: '🧀 The Packers Parade: 9 Heroes Ride the Cheese Wave',
          content: [
            'Talk about a mob mentality that paid off! Nine players jumped on the Green Bay Packers bandwagon, and boy, did it roll right over the doubters. All correct—boom, 100% survival for the cheesehead contingent!',
            'Packers Posse (all survived): Taylor Root, Tyler Roberts, Dustin Dimicelli, RazG, Josh, Bobbie Boucher, Jordan Petrusich, Taylor Gaussoin, Amanda G',
            'Y\'all turned Week 6 into a Lambeau Leap of faith. As for the other smart cookies who zigged while others zagged:',
            '• Patriots (2): Decks, Jaren Petrusich – Channeling that Week 5 upset energy like a Stranger Things comeback kid.',
            '• Rams (2): Steven McCoy, Joe G – Stafford\'s arm stayed hot, no Warner injury drama here.',
            '• Broncos (1): JSizzle – Denver\'s pass rush feasted like a Willy Wonka golden ticket.',
            '• Colts (1): Matador – Steady Eddie win, no Cam Ward Titan upset to rain on your parade.',
            '• Steelers (1): Brandon O\'Dore – Pittsburgh grinded it out, because of course they did.',
            'Only one loss in 17 picks? That\'s not luck; that\'s the kind of week that makes you feel like you hacked the Matrix.'
          ]
        },
        {
          type: 'info',
          heading: '📊 Updated Standings: Safe Zone Shrinks, Danger Zone Explodes',
          content: [
            'We\'re tightening up like a Squid Game elimination round—16 alive, but 68% on their final life? The pressure\'s thicker than a Breaking Bad blue candy cook-off.',
            '🟢 2 Lives (Safe Zone – 5 Players): Brandon O\'Dore, Amanda G, Decks, Steven McCoy, Tyler Roberts. Y\'all are loungin\' like VIPs at a Barbie dreamhouse party. Keep it up!',
            '🟡 1 Life (Danger Zone – 11 Players): Jaren Petrusich, Jordan Petrusich, Taylor Gaussoin, Matador, RazG, JSizzle, Bobbie Boucher, Joe G, Taylor Root, Dustin Dimicelli, Josh. One wrong pick, and you\'re ghost-town bound. Channel your inner Katniss—aim true for Week 7!',
            '💀 Eliminated (9 Total): Kevyn R (Week 2), CoDore/Shneebly/Dalton (Week 4), Hayden Gaussoin/Osprey/Dan Evans/Kyler Stroud (Week 5), and now Keegan McAdam (Week 6). The graveyard\'s poppin\' like a Zombieland reunion.',
            'Survival rate holding at 64% overall, but with 11 on the bubble, Week 7\'s gonna be a bloodbath. Who\'s got the strategy tools to survive?'
          ]
        },
        {
          type: 'info',
          heading: '🏈 NFL Week 6: Upsets, Sacks, and "Wait, What?!" Moments',
          content: [
            'The league served up drama hotter than a Real Housewives reunion—sacks galore (seven QBs dropped four+ times, oof), underdogs barking, and finishes that had X exploding like a Viral TikTok gone wrong. Key chaos:',
            '• Bills Shocked by Falcons on MNF: Josh Allen\'s crew got grounded in Atlanta—defense clamped \'em like a Stranger Things Upside Down trap. Falcons\' time-of-possession game clocked in longer than a Marvel post-credits scene.',
            '• Panthers Pull Cowboy Carnage: Carolina upset Dallas in a thriller—Dak Prescott\'s fumble-fest turned it into a Yellowstone ranch raid gone wrong. Bryce Young finally looked like the No. 1 pick he was drafted to be.',
            '• Giants Stun Eagles (Again?!): Jaxson Dart\'s rookie magic shocked Philly, bringing positive vibes to New York like a Gossip Girl Upper East Side glow-up. Eagles\' offense? Still fizzlin\' like a dud firework.',
            '• Bucs Edge Niners in Injury-palooza: Baker Mayfield\'s deep bombs and highlight runs held off SF, but Fred Warner\'s injury hit like a Game of Thrones Red Wedding gut-punch. Tampa\'s now fringe Super Bowl talk—Mayfield for MVP?',
            '• Lions Roar Past Chiefs? Detroit\'s play-action play kept KC\'s secondary sweatin\', but Mahomes clawed back for a shootout. Goff\'s arm stayed golden.',
            '• Bengals\' QB Carousel Spins: Joe Burrow traded? Nah, but Jake Browning\'s INT party vs. Packers had Cincy last in yards like a Schitt\'s Creek outcast. Flacco who?',
            'Bonus weirdness: Highest sack week since... ever? QBs were runnin\' for cover like The Amazing Race contestants dodging eliminations. And that Packers-Bengals weird finish? Bizarre as a Black Mirror episode.'
          ]
        },
        {
          type: 'warning',
          heading: '⚡ Week 7 Wake-Up Call: Lock In or Log Out!',
          content: [
            'Week 6\'s closed, but Week 7\'s gates are creakin\' open—get those picks in via the app before the deadline, or risk a Keegan-style no-show shade (but hey, at least you won\'t lose by one point).',
            'With 11 on one life, it\'s do-or-die: Use those strategy tools, scout the odds, and rally your private league for moral support. Will the Packers run repeat? Can the danger zone dodge another bullet?',
            'Pro Tip: Check the app for real-time odds, strategy tools, and private league banter. Don\'t be the next gravestone.',
            'Stay sassy, stay survivin\'. Drop us a line in the chat if you\'re feelin\' the heat—we\'re all in this gridiron gamble together.'
          ]
        },
        {
          type: 'text',
          content: '— The Pick\'em Party Crew'
        }
      ]
    }
  }

  return content[week] || {
    title: `Week ${week}: Results & Analysis`,
    subtitle: `Week ${week} recap coming soon`,
    paragraphs: [
      {
        type: 'text',
        content: `Week ${week} has wrapped up! Check back soon for the full recap with all the drama, stats, and survivor pool updates.`
      }
    ]
  }
}
