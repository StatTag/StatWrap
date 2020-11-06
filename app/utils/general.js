export default class GeneralUtil {
  static formatDateTime(date) {
    if (!date || date === '') {
      return '';
    }

    let formattableDate = date;
    if (typeof date === 'string' || date instanceof String) {
      const parsedDate = Date.parse(date);
      if (Number.isNaN(parsedDate)) {
        return date;
      }
      formattableDate = new Date(parsedDate);
    }
    const [day, time] = formattableDate.toISOString().split('T');
    const formatted = `${day} ${time.split('.')[0]}`;
    return formatted;
  }
}
