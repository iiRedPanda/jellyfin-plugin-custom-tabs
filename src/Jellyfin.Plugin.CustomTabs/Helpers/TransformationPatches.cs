using System.Reflection;
using Jellyfin.Plugin.CustomTabs.Model;

namespace Jellyfin.Plugin.CustomTabs.Helpers
{
    public static class TransformationPatches
    {
        public static string IndexHtml(PatchRequestPayload payload)
        {
            const string ScriptId = "custom-tabs-jf12";
            string contents = payload.Contents ?? string.Empty;
            if (contents.Contains($"id=\"{ScriptId}\"", StringComparison.Ordinal))
            {
                return contents;
            }

            Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream($"{typeof(CustomTabsPlugin).Namespace}.Inject.addCustomTabs.js")!;
            using TextReader reader = new StreamReader(stream);
            return contents.Replace("</body>", $"<script id=\"{ScriptId}\" defer>{reader.ReadToEnd()}</script></body>", StringComparison.OrdinalIgnoreCase);
        }
    }
}
