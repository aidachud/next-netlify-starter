<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Swimming Session Feedback Form</title>
  </head>
  <body>
    <h1>Swimming Session Feedback Form</h1>
    <form id="feedback-form">
      <label for="enjoyment">How did you enjoy the session?</label>
      <select id="enjoyment" name="enjoyment">
        <option value="loved it">Loved it!</option>
        <option value="okay">It was okay</option>
        <option value="didnt enjoy it">Didn't enjoy it</option>
      </select>

      <label for="effort">How much effort did you perceive during the session?</label>
      <select id="effort" name="effort">
        <option value="low">Low</option>
        <option value="moderate">Moderate</option>
        <option value="high">High</option>
        <option value="very high">Very high</option>
      </select>

      <label for="mood-before">How would you describe your mood before the session?</label>
      <input type="range" id="mood-before" name="mood-before" min="-10" max="10">

      <label for="mood-after">How would you describe your mood after the session?</label>
      <input type="range" id="mood-after" name="mood-after" min="-10" max="10">

      <label for="soreness">Did you experience any soreness?</label>
      <input type="checkbox" id="soreness" name="soreness">

      <label for="injury">Did you have any injuries?</label>
      <input type="checkbox" id="injury" name="injury">

      <label for="rating">How would you rate the session overall?</label>
      <input type="range" id="rating" name="rating" min="1" max="10">

      <button type="submit">Submit</button>
    </form>

    <script src="feedback.js"></script>
  </body>
</html>
