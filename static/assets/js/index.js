let app = null;
// Handle pops
const handlePop = (evt) => {
    let path = evt.target.location.pathname;
    if (path === '/') app.newDocument(true);
    else app.loadDocument(path.substring(1, path.length));
};
// Set up the pop state to handle loads, skipping the first load
// to make chrome behave like others:
// http://code.google.com/p/chromium/issues/detail?id=63040
setTimeout(() => {
    window.onpopstate = (evt) => {
        try { handlePop(evt); } catch(e) { /* not loaded yet */ }
    };
}, 1000);
// Construct app and load initial path
$(() => {
    app = new haste('Derpy Haste', { twitter: true });
    handlePop({ target: window });
});