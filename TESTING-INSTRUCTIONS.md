# 🏈 Pick'em Party v2 - TEST VERSION 
## Testing Instructions for Friends & Beta Users

### 🚨 **IMPORTANT: This is a TEST VERSION**
This build includes simulation tools and test data for pre-season testing. The platform is fully functional but contains additional admin tools for testing eliminations and league mechanics.

---

## 🎮 **How to Join & Test**

### **1. Access the Platform**
**Live URL:** `https://pickem-party-v2.vercel.app` *(replace with your actual Vercel URL)*

### **2. Test User Accounts (PIN: 1234)**
Ready-to-use friend accounts:
- **jaren** - Jaren Petrusich  
- **jordan** - Jordan Petrusich
- **brandon** - Brandon O'Dore
- **hayden** - Hayden Gaussoin
- **dan** - Dan Evans

### **3. Join the Test League**
- **League URL:** `/league/test-1`
- **League Name:** "Test 1" 
- All test users are already members with 2 lives each

---

## 🧪 **What to Test**

### **Core Functionality:**
1. **Login** - Use any test username + PIN 1234
2. **View League** - See standings, member status, current week
3. **Make Picks** - Select teams for current week (if live games available)
4. **Check Status** - View your life count (❤️❤️, ❤️, or 💀)
5. **League Standings** - See who's winning, eliminated, etc.

### **Mobile Experience:**
- Test on actual phones (iOS/Android)
- Check touch targets and responsiveness
- Verify retro 8-bit styling displays correctly

### **Key Features to Validate:**
- ✅ User authentication with PIN system
- ✅ League membership and status tracking  
- ✅ Pick submission and validation
- ✅ Life tracking (2-life elimination system)
- ✅ Mobile-first responsive design
- ✅ Retro gaming UI/UX

---

## 🛠️ **Admin Testing Tools**

### **Admin Dashboard Access:**
- **URL:** `/admin/dashboard`
- **Username:** `pickemking`
- **Password:** `nfl2025champion`

### **SIMULATE Tab Features:**
1. **Create Test Users** - Generate the 5 friend accounts
2. **Import 2024 Results** - Load historical NFL data (weeks 1-6)
3. **Generate Picks** - Auto-generate smart picks for any week
4. **Process Week** - Apply game results and update eliminations
5. **Full Simulation** - Run multi-week automation with eliminations
6. **League Status** - View detailed standings with pick history
7. **Reset League** - Clear all data for fresh testing

### **Simulation Test Results:**
Last simulation through Week 5:
- **9 total players** (original 4 + 5 test friends)
- **7 survivors** with varying life counts
- **2 eliminated** (Jordan & Matt in Week 4)  
- **43 picks generated**, 39 processed (eliminations prevent future picks)

---

## 📱 **Testing Scenarios**

### **Scenario 1: New User Experience**
1. Visit league URL as new user
2. Create account with username/PIN
3. Join league and explore interface
4. Submit picks and check status

### **Scenario 2: Elimination Testing**  
1. Admin: Run simulation through Week 6
2. Users: Check who gets eliminated
3. Test resurrection features (if implemented)
4. Verify life tracking accuracy

### **Scenario 3: Mobile Testing**
1. Test on various phone sizes
2. Check touch interactions
3. Verify 8-bit graphics display properly
4. Test league sharing via text message

### **Scenario 4: League Management**
1. Admin: Create additional leagues  
2. Test invite codes and league privacy
3. Verify member management tools
4. Test commissioner controls

---

## 🐛 **What to Report**

### **High Priority Issues:**
- Authentication failures or login loops
- Pick submission not working
- Mobile layout breaking
- Life tracking inaccuracies
- Performance issues on mobile

### **Medium Priority:**
- UI/UX improvements
- Missing features or confusing workflows  
- Social sharing not working properly
- Visual/styling improvements

### **Low Priority:**
- Nice-to-have features
- Additional admin tools
- Performance optimizations

---

## ⚡ **Quick Test Commands**

### **For Developers/Power Users:**

```bash
# Check league status via API
curl -X POST https://your-app.vercel.app/api/admin/league-status \
  -H "Content-Type: application/json" \
  -d '{"leagueId": "c8879ee2-b3bc-4cb0-a9ee-05083e75f8ca"}'

# Run fresh simulation  
curl -X POST https://your-app.vercel.app/api/admin/simulate \
  -H "Content-Type: application/json" \
  -d '{"action": "simulate-weeks", "leagueId": "c8879ee2-b3bc-4cb0-a9ee-05083e75f8ca", "week": 6}'

# Reset league for fresh testing
curl -X POST https://your-app.vercel.app/api/admin/reset-league \
  -H "Content-Type: application/json" \
  -d '{"leagueId": "c8879ee2-b3bc-4cb0-a9ee-05083e75f8ca"}'
```

---

## 📞 **Contact & Feedback**

**For Issues/Feedback:**
- Report bugs or suggestions directly to Taylor
- Include screenshots for UI issues
- Note device/browser for compatibility issues

**Expected Timeline:**
- Testing Phase: Current → NFL Season Start
- Bug Fixes: Ongoing during testing
- Production Launch: Week 1 NFL 2025

---

## 🎯 **Success Criteria**

The platform is ready for real use when:
- ✅ All friends can login and navigate easily  
- ✅ Pick submission works reliably on mobile
- ✅ Elimination tracking is accurate
- ✅ Social sharing shows proper meta image
- ✅ No critical bugs reported during testing

**Happy Testing! 🎮🏈**