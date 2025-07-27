const express = require('express');
const router = express.Router();
const { pool } = require('../firebase.js');
const verify_firebase_token = require('../middlewares/verify_token');
const axios = require('axios');

router.get('/', verify_firebase_token, async (req, res) => {
    const uid = req.user.uid;
    const snapshot = await pool.collection('checklists').where('user_id', '==', uid).orderBy('created_at', 'desc').get();
    const checklists = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    res.render('checklists', { checklists });
});

router.post('/create', verify_firebase_token, async (req, res) => {
    const { title, purpose } = req.body;
    const uid = req.user.uid;
    const aiItems = await generateChecklistItems(purpose);
    const checklistRef = await pool.collection('checklists').add({
        title,
        purpose,
        user_id: uid,
        created_at: new Date()
    });
    const batch = pool.batch();
    aiItems.forEach(item => {
        const itemRef = checklistRef.collection('items').doc();
        batch.set(itemRef, {
            text: item,
            is_checked: false,
            created_at: new Date()
        });
    });
    await batch.commit();
    res.redirect('/checklists');
});

router.get('/:id', verify_firebase_token, async (req, res) => {
    const uid = req.user.uid;
    const checklistId = req.params.id;
    const checklistRef = pool.collection('checklists').doc(checklistId);
    const checklistSnap = await checklistRef.get();
    if (!checklistSnap.exists || checklistSnap.data().user_id !== uid) {
        return res.status(403).send("Forbidden");
    }
    const itemsSnap = await checklistRef.collection('items').orderBy('created_at').get();
    const items = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    res.render('checklist_detail', { checklist: { id: checklistId, ...checklistSnap.data() }, items });
});

router.post('/:id/items/add', verify_firebase_token, async (req, res) => {
    const { text } = req.body;
    const uid = req.user.uid;
    const checklistRef = pool.collection('checklists').doc(req.params.id);
    const doc = await checklistRef.get();
    if (!doc.exists || doc.data().user_id !== uid) return res.sendStatus(403);
    await checklistRef.collection('items').add({
        text,
        is_checked: false,
        created_at: new Date()
    });
    res.redirect(`/checklists/${req.params.id}`);
});


router.post('/:id/items/:itemId/toggle', verify_firebase_token, async (req, res) => {
    const { id, itemId } = req.params;
    const uid = req.user.uid;
    const checklistRef = pool.collection('checklists').doc(id);
    const doc = await checklistRef.get();
    if (!doc.exists || doc.data().user_id !== uid) return res.sendStatus(403);
    const itemRef = checklistRef.collection('items').doc(itemId);
    const itemSnap = await itemRef.get();
    const current = itemSnap.data().is_checked;
    await itemRef.update({ is_checked: !current });
    res.redirect(`/checklists/${id}`);
});

router.delete('/:id/delete', verify_firebase_token, async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;

    const checklistRef = pool.collection('checklists').doc(id);
    const doc = await checklistRef.get();

    if (!doc.exists || doc.data().user_id !== uid) return res.sendStatus(403);
    const itemsSnapshot = await checklistRef.collection('items').get();
    const batch = pool.batch();
    itemsSnapshot.forEach(itemDoc => {
        batch.delete(itemDoc.ref);
    });
    batch.delete(checklistRef);
    await batch.commit();

    res.redirect('/checklists');
});



async function generateChecklistItems(purpose) {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
            { role: "system", 
            content: `You are a helpful assistant that creates short checklists. Only output a plain list of 5 to 8 essential items with no formatting, no numbering, and no categories. Respond only with the checklist items based on the user's purpose.` },
            { role: "user", content: purpose }
        ]
    }, {
        headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    const content = res.data.choices?.[0]?.message?.content || "";
    return content.split(/\n|•|-/)
        .map(line => line.trim())
        .filter(line => line.length > 3);
}

router.use((req, res) => {
    res.status(404).render('error_404');
});
module.exports = router;
